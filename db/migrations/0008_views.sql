-- Convenience reporting views over the investor graph.

-- The government-backed cascade, traced end to end: Funder -> Programme ->
-- Fund -> portfolio company. One row per (commitment, investment) pair
-- reaching a QUILT-tagged company.
CREATE VIEW v_govt_backed_cascade AS
SELECT
    funder.id           AS funder_org_id,
    funder.canonical_name AS funder_name,
    p.id                 AS programme_id,
    p.name               AS programme_name,
    f.id                 AS fund_id,
    f.canonical_name     AS fund_name,
    c.amount_gbp,
    c.commit_date,
    portfolio.id          AS portfolio_org_id,
    portfolio.crn         AS portfolio_crn,
    portfolio.canonical_name AS portfolio_name,
    i.round_date
FROM commitment c
JOIN org funder ON funder.id = c.funder_org_id
LEFT JOIN programme p ON p.id = c.programme_id
JOIN fund f ON f.id = c.fund_id
JOIN investment i ON i.investor_fund_id = f.id
JOIN org portfolio ON portfolio.id = i.portfolio_org_id
WHERE portfolio.is_quilt_tagged;

-- Investor graph summary: one row per canonical org, with its resolved
-- alias count and role counts. Useful as a sanity check on the entity
-- resolution backlog (org_alias/resolution_queue coverage).
CREATE VIEW v_investor_summary AS
SELECT
    o.id,
    o.canonical_name,
    o.crn,
    o.org_kind,
    (SELECT count(*) FROM org_alias oa WHERE oa.org_id = o.id) AS alias_count,
    (SELECT count(*) FROM commitment c WHERE c.funder_org_id = o.id) AS commitments_made,
    (SELECT count(*) FROM investment inv WHERE inv.investor_org_id = o.id) AS direct_investments_made
FROM org o;
