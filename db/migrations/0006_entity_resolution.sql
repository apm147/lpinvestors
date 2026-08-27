-- Entity resolution is the actual build (docs/DESIGN.md #2) -- these two
-- tables are where that effort lands.

-- Alias table: raw extracted surface forms ("BBB", "British Business Bank",
-- a CH-registered legal name that doesn't match its trading name in press
-- coverage) -> canonical org/fund id. Populated by the crn-match and
-- alias-table resolution steps.
CREATE TABLE org_alias (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_name    text NOT NULL,
    org_id      uuid REFERENCES org(id),
    fund_id     uuid REFERENCES fund(id),
    source      text, -- where this surface form was seen
    resolved_by resolution_method NOT NULL,
    resolved_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT org_alias_one_target CHECK (
        (org_id IS NOT NULL)::int + (fund_id IS NOT NULL)::int = 1
    )
);

CREATE INDEX idx_org_alias_raw_name ON org_alias(raw_name);
CREATE INDEX idx_org_alias_org_id ON org_alias(org_id);
CREATE INDEX idx_org_alias_fund_id ON org_alias(fund_id);

-- Manual review queue: names that didn't resolve via crn match or the alias
-- table. An uncertain match stays here rather than being force-merged --
-- false merges are more damaging to a research/policy dataset than a
-- duplicate row (docs/DESIGN.md #2).
CREATE TABLE resolution_queue (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_name          text NOT NULL,
    source            text,
    candidate_org_ids uuid[], -- suggested matches, if any, for reviewer triage
    status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
    created_at        timestamptz NOT NULL DEFAULT now(),
    reviewed_at       timestamptz
);

CREATE INDEX idx_resolution_queue_status ON resolution_queue(status) WHERE status = 'open';
