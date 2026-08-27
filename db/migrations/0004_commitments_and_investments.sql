-- COMMIT: an LP commitment, Funder -> Fund. Sourced from government LP list
-- monitoring (see docs/data-sources.md) or press coverage of a private
-- self-disclosure (e.g. a Mansion House Accord signatory).
CREATE TABLE commitment (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    funder_org_id   uuid NOT NULL REFERENCES org(id),
    -- Null when the funder committed directly rather than via a named
    -- government programme (e.g. a pension provider's direct commitment).
    programme_id    uuid REFERENCES programme(id),
    fund_id         uuid NOT NULL REFERENCES fund(id),
    amount_gbp      numeric,   -- often null -- e.g. SNIB discloses an aggregate across funds, not a per-fund amount
    commit_date     date,
    source_url      text NOT NULL,
    confidence      confidence_level NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commitment_funder_org_id ON commitment(funder_org_id);
CREATE INDEX idx_commitment_programme_id ON commitment(programme_id);
CREATE INDEX idx_commitment_fund_id ON commitment(fund_id);

-- Fund or direct-investing org -> portfolio company. Sourced from cap-table
-- extraction: CS01 shareholder-list deltas, timed against SH01 rounds to
-- know which round each change belongs to (docs/DESIGN.md #2 -- SH01 alone
-- gives round timing and size, not investor identity; CS01 is where
-- shareholder identity actually surfaces).
CREATE TABLE investment (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_org_id   uuid REFERENCES org(id),  -- for direct-investing orgs
    investor_fund_id  uuid REFERENCES fund(id), -- for fund vehicles
    portfolio_org_id  uuid NOT NULL REFERENCES org(id),
    round_date        date,   -- from the associated SH01
    source_filing     text,   -- e.g. 'CS01 2026-03-14'
    created_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT investment_one_investor CHECK (
        (investor_org_id IS NOT NULL)::int + (investor_fund_id IS NOT NULL)::int = 1
    )
);

CREATE INDEX idx_investment_investor_org_id ON investment(investor_org_id);
CREATE INDEX idx_investment_investor_fund_id ON investment(investor_fund_id);
CREATE INDEX idx_investment_portfolio_org_id ON investment(portfolio_org_id);
