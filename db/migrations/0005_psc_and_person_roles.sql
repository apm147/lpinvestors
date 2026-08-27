-- PSC_of: individual -> company, significant control (>=25% shares/votes,
-- board-appointment right, or other significant influence). Sourced
-- directly from the PSC register.
CREATE TABLE psc_control (
    person_id      uuid NOT NULL REFERENCES person(id),
    org_id         uuid NOT NULL REFERENCES org(id),
    control_nature text NOT NULL, -- e.g. 'ownership-of-shares-25-to-50-percent', per CH's PSC vocabulary
    notified_date  date,
    PRIMARY KEY (person_id, org_id, control_nature)
);

CREATE INDEX idx_psc_control_org_id ON psc_control(org_id);

-- officer_of / GP_of: individual -> fund or org, unwinding a corporate GP
-- to the individuals behind it (briefing note, linkage 03). One of
-- fund_id/org_id is set, never both.
CREATE TABLE person_role (
    id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id uuid NOT NULL REFERENCES person(id),
    fund_id   uuid REFERENCES fund(id),
    org_id    uuid REFERENCES org(id),
    role      text NOT NULL, -- e.g. 'general_partner', 'officer'
    CONSTRAINT person_role_one_target CHECK (
        (fund_id IS NOT NULL)::int + (org_id IS NOT NULL)::int = 1
    )
);

CREATE INDEX idx_person_role_person_id ON person_role(person_id);
CREATE INDEX idx_person_role_fund_id ON person_role(fund_id);
CREATE INDEX idx_person_role_org_id ON person_role(org_id);
