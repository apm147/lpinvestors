-- FUND: fund vehicles, distinct from both their GP and their LPs. Secondary
-- record under the LP-primary framing (docs/DESIGN.md #1, #3): a fund
-- explains *how* a Funder's capital reached a company, it isn't a full
-- profile subject in its own right.
CREATE TABLE fund (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name text NOT NULL,
    crn            varchar(10) UNIQUE, -- set where the fund is itself a registered UK limited partnership
    gp_org_id      uuid REFERENCES org(id),
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fund_crn ON fund(crn);
CREATE INDEX idx_fund_gp_org_id ON fund(gp_org_id);

-- PROGRAMME: government programmes / sub-funds. Own row per programme --
-- "BBB" is not one umbrella (docs/data-sources.md): British Patient
-- Capital, British Growth Partnership, the ECF programme, and the Nations
-- and Regions funds each need their own tracked disclosure surface and
-- update cadence, even where they share a parent institution and web
-- domain.
CREATE TABLE programme (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL UNIQUE, -- e.g. 'British Patient Capital', 'NSSIF', 'Enterprise Capital Funds'
    parent_org_id   uuid REFERENCES org(id), -- e.g. British Business Bank
    disclosure_url  text, -- the tracked monitoring surface for this specific programme, not its parent's
    confidence      confidence_level,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_programme_parent_org_id ON programme(parent_org_id);
