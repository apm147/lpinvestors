-- Crowd-in/out by channel: the pipeline's actual output (docs/DESIGN.md #4,
-- #6). Per company: has public support arrived as a grant, as government
-- equity/LP capital, both, or neither.
--
-- Grant-side data (QUILT) is read-joined by crn at query time to compute
-- has_direct_grant -- never duplicated into this schema (docs/DESIGN.md
-- #3, "not modelled as owned data inside this system"). This table stores
-- only the classification result.
CREATE TYPE crowd_channel AS ENUM ('grant_only', 'equity_only', 'both', 'neither');

CREATE TABLE crowd_in_out (
    org_id           uuid PRIMARY KEY REFERENCES org(id),
    has_direct_grant boolean NOT NULL,       -- from the QUILT read-join on crn
    has_govt_equity  boolean NOT NULL,       -- derived from the commitment -> investment chain reaching this org
    channel          crowd_channel NOT NULL,
    computed_at      timestamptz NOT NULL DEFAULT now()
);
