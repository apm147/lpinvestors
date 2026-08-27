-- ORG: the entity type shared by GPs, LPs, government bodies, and
-- portfolio/founder companies. Anchored on Companies House number (crn)
-- wherever a filing provides one -- see docs/DESIGN.md #3, "Companies House
-- number as the primary resolution key wherever a filing provides one."
--
-- `crn` is the join key shared with the sibling modules (QUILT's
-- dim_participant.crn, dtfunding's companies.company_number) -- see
-- docs/DESIGN.md #5.
CREATE TABLE org (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name  text NOT NULL,
    crn             varchar(10) UNIQUE, -- null for entities without a UK CH registration (e.g. some government bodies)
    org_kind        org_kind NOT NULL,
    -- Scoping flag: is this company within QUILT's frontier-tech tag set?
    -- The investor tracker's universe is bounded by this, not by "every UK
    -- company" -- see docs/DESIGN.md #1. Set by the QUILT read-join, not
    -- owned data.
    is_quilt_tagged boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_org_updated_at
    BEFORE UPDATE ON org
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_org_crn ON org(crn);
CREATE INDEX idx_org_quilt_tagged ON org(is_quilt_tagged) WHERE is_quilt_tagged;

-- PERSON: PSC-disclosed individuals, kept as a distinct entity type from
-- `org`. Per docs/DESIGN.md #3: PSC individuals are mostly founders and
-- controlling shareholders (25%+ threshold), not the broader VC/LP
-- population -- conflating them with vehicle-type Funders would corrupt the
-- graph's meaning.
--
-- Companies House doesn't expose a stable person-id the way it does a
-- company number, so this uses the same composite key Companies House
-- itself uses to disambiguate PSCs: name + date-of-birth month/year +
-- nationality.
CREATE TABLE person (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name   text NOT NULL,
    dob_month   smallint CHECK (dob_month BETWEEN 1 AND 12),
    dob_year    smallint,
    nationality text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (full_name, dob_month, dob_year, nationality)
);
