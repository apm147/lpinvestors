-- Extensions and shared enums.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- What kind of thing an `org` row is. One table serves both sides of the
-- graph (a company can be a Funder in one relationship and a portfolio
-- company in another), so this is a classification of the row, not a
-- table split.
CREATE TYPE org_kind AS ENUM (
    'company',           -- portfolio/founder company
    'gp',                -- fund manager / general partner
    'government_body',   -- BBB, NSSIF's parent, SNIB, NWF, etc.
    'pension_provider',  -- e.g. Aegon UK, NatWest Cushon, M&G
    'other'
);

-- Source-confidence rating, applied per-fact (a commitment, a programme's
-- disclosure surface) rather than per-entity -- two facts about the same
-- programme can carry different confidence (e.g. BGP's LP roster is high
-- confidence, its eventual portfolio-company list may not be).
CREATE TYPE confidence_level AS ENUM ('high', 'medium', 'low');

-- How a raw extracted name was resolved onto a canonical org/fund id.
-- See docs/DESIGN.md #3 for the resolution priority this enum reflects.
CREATE TYPE resolution_method AS ENUM ('crn_match', 'alias_table', 'manual_review');

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
