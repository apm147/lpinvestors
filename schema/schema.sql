-- Investor Tracker — draft entity graph schema
--
-- Design rationale: docs/DESIGN.md §3. This is a first-pass DDL to ground the design,
-- not a migration-ready schema — expect it to move once Phase 1 (entity resolution
-- core) is actually implemented.
--
-- Join key convention: `crn` (Companies House number) is the integration point with
-- sibling modules (QUILT's dim_participant.crn, dtfunding's companies.id).

-- ── Entities ─────────────────────────────────────────────────────────────────

-- ORG: GPs, LPs, government bodies, portfolio/founder companies. One record type
-- for both sides of the graph.
CREATE TABLE org (
    org_id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    canonical_name  TEXT NOT NULL,
    crn             TEXT UNIQUE,              -- Companies House number; null for entities without one (e.g. some govt bodies)
    org_kind        TEXT NOT NULL CHECK (org_kind IN (
                        'company',            -- portfolio/founder company
                        'gp',                 -- fund manager / general partner
                        'government_body',    -- BBB, NSSIF parent, SNIB, NWF, etc.
                        'pension_provider',   -- e.g. Aegon UK, NatWest Cushon, M&G
                        'other'
                    )),
    is_quilt_tagged BOOLEAN NOT NULL DEFAULT FALSE,  -- scoping flag: within QUILT's frontier-tech tag set
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PERSON: PSC-disclosed individuals. Composite natural key mirrors how Companies
-- House itself disambiguates PSCs (no stable person-ID exists in source data).
CREATE TABLE person (
    person_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name       TEXT NOT NULL,
    dob_month       SMALLINT CHECK (dob_month BETWEEN 1 AND 12),
    dob_year        SMALLINT,
    nationality     TEXT,
    UNIQUE (full_name, dob_month, dob_year, nationality)
);

-- FUND: fund vehicles, distinct from their GP and their LPs.
CREATE TABLE fund (
    fund_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    canonical_name  TEXT NOT NULL,
    crn             TEXT UNIQUE,              -- where fund is a registered UK LP
    gp_org_id       BIGINT REFERENCES org(org_id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROGRAMME: government programmes / sub-funds. Own row per programme — "BBB" is
-- not one umbrella (docs/data-sources.md).
CREATE TABLE programme (
    programme_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            TEXT NOT NULL,             -- e.g. 'British Patient Capital', 'NSSIF', 'ECF'
    parent_org_id   BIGINT REFERENCES org(org_id),  -- e.g. BBB
    disclosure_url  TEXT,                      -- tracked monitoring surface for this specific programme
    confidence      TEXT CHECK (confidence IN ('high', 'medium', 'low')),
    notes           TEXT
);

-- ── Relationships ────────────────────────────────────────────────────────────

-- COMMIT: LP commitment, Funder -> Fund.
CREATE TABLE commitment (
    commitment_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    funder_org_id   BIGINT NOT NULL REFERENCES org(org_id),
    programme_id    BIGINT REFERENCES programme(programme_id),  -- null if funder committed directly, not via a named programme
    fund_id         BIGINT NOT NULL REFERENCES fund(fund_id),
    amount_gbp      NUMERIC,                  -- often null (e.g. SNIB discloses aggregate only, not per-fund)
    commit_date     DATE,
    source_url      TEXT NOT NULL,
    confidence      TEXT CHECK (confidence IN ('high', 'medium', 'low')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fund/direct-investing org -> portfolio company. Sourced from cap-table extraction
-- (CS01 shareholder-list deltas, timed against SH01 rounds).
CREATE TABLE investment (
    investment_id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    investor_org_id BIGINT REFERENCES org(org_id),   -- for direct-investing orgs
    investor_fund_id BIGINT REFERENCES fund(fund_id), -- for fund vehicles
    portfolio_org_id BIGINT NOT NULL REFERENCES org(org_id),
    round_date      DATE,                     -- from SH01
    source_filing   TEXT,                     -- e.g. 'CS01 2026-03-14'
    CONSTRAINT investment_one_investor CHECK (
        (investor_org_id IS NOT NULL)::int + (investor_fund_id IS NOT NULL)::int = 1
    )
);

-- PSC_of: individual -> company, significant control.
CREATE TABLE psc_control (
    person_id       BIGINT NOT NULL REFERENCES person(person_id),
    org_id          BIGINT NOT NULL REFERENCES org(org_id),
    control_nature  TEXT,                     -- e.g. 'ownership-of-shares-25-to-50-percent'
    notified_date   DATE,
    PRIMARY KEY (person_id, org_id, control_nature)
);

-- officer_of / GP_of: individual -> fund or org, unwinding corporate GPs to people.
CREATE TABLE person_role (
    person_id       BIGINT NOT NULL REFERENCES person(person_id),
    fund_id         BIGINT REFERENCES fund(fund_id),
    org_id          BIGINT REFERENCES org(org_id),
    role            TEXT NOT NULL,             -- e.g. 'general_partner', 'officer'
    CONSTRAINT person_role_one_target CHECK (
        (fund_id IS NOT NULL)::int + (org_id IS NOT NULL)::int = 1
    )
);

-- ── Entity resolution ────────────────────────────────────────────────────────

-- Alias table: raw extracted names -> canonical org/fund id. The core of Phase 1.
CREATE TABLE org_alias (
    alias_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    raw_name        TEXT NOT NULL,
    org_id          BIGINT REFERENCES org(org_id),
    fund_id         BIGINT REFERENCES fund(fund_id),
    source          TEXT,                      -- where this surface form was seen
    resolved_by     TEXT NOT NULL CHECK (resolved_by IN ('crn_match', 'alias_table', 'manual_review')),
    resolved_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT org_alias_one_target CHECK (
        (org_id IS NOT NULL)::int + (fund_id IS NOT NULL)::int = 1
    )
);

-- Manual review queue: unresolved raw names. An uncertain match stays here rather
-- than being force-merged (false merges are worse than duplicate rows for this
-- dataset).
CREATE TABLE resolution_queue (
    queue_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    raw_name        TEXT NOT NULL,
    source          TEXT,
    candidate_org_ids BIGINT[],                -- suggested matches, if any, for reviewer triage
    status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at     TIMESTAMPTZ
);

-- ── Outputs (Phase 4) ────────────────────────────────────────────────────────

-- Per-company crowd-in/out classification. Grant-side data (QUILT) is read-joined
-- by crn at query time, never duplicated here — this view/table stores only the
-- classification result, not the underlying grant records.
CREATE TABLE crowd_in_out (
    org_id              BIGINT PRIMARY KEY REFERENCES org(org_id),
    has_direct_grant    BOOLEAN NOT NULL,      -- from QUILT join on crn
    has_govt_equity     BOOLEAN NOT NULL,      -- derived from commitment -> investment chain reaching this org
    channel             TEXT NOT NULL CHECK (channel IN ('grant_only', 'equity_only', 'both', 'neither')),
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_crn ON org(crn);
CREATE INDEX idx_fund_crn ON fund(crn);
CREATE INDEX idx_org_quilt_tagged ON org(is_quilt_tagged) WHERE is_quilt_tagged;
CREATE INDEX idx_resolution_queue_status ON resolution_queue(status) WHERE status = 'open';
