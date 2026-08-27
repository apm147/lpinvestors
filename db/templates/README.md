# Data entry templates

CSV templates for hand-populating the investor graph — one file per table in
[`db/migrations/`](../migrations), matching its columns exactly. Fill these in
(e.g. from government LP list monitoring or cap-table extraction done by hand),
then load them into `lpinvestors_test` / the production database.

**No load script exists yet** — populating these is Phase 1/2 work
([`docs/DESIGN.md`](../../docs/DESIGN.md#8-phased-roadmap)), the load script
that consumes them is not. The `ref_key` convention below is this template's
proposed contract for that script, not a working tool yet. Until it exists,
these can still be loaded by hand: resolve `ref_key`s to real UUIDs yourself
(e.g. in a spreadsheet or a throwaway script) and `psql \copy` or `INSERT` the
result.

## Files, in load order

Numbered by dependency order — an entity referenced by a later file must
already have a row in its own file.

| File | Table | Depends on |
|---|---|---|
| `01_org.csv` | `org` | — |
| `02_programme.csv` | `programme` | `org` |
| `03_fund.csv` | `fund` | `org` |
| `04_person.csv` | `person` | — |
| `05_commitment.csv` | `commitment` | `org`, `programme`, `fund` |
| `06_investment.csv` | `investment` | `org`, `fund` |
| `07_psc_control.csv` | `psc_control` | `person`, `org` |
| `08_person_role.csv` | `person_role` | `person`, `fund`, `org` |
| `09_org_alias.csv` | `org_alias` | `org`, `fund` |

Two tables are deliberately **not** here: `resolution_queue` fills itself when
a name doesn't auto-resolve (docs/DESIGN.md #3) — nothing to hand-populate up
front — and `crowd_in_out` is a computed output, not an input.

## The `ref_key` convention

Every table has a real primary key (`uuid`, server-generated) that doesn't
exist yet while you're filling in a spreadsheet by hand. `01_org.csv`,
`02_programme.csv`, `03_fund.csv`, and `04_person.csv` each have a `ref_key`
column instead: a short label you choose (`org_bbb`, `fund_bgp1`, ...), unique
within your batch of files, used only to link rows across these CSVs. It is
**never written to the database** — the load step resolves it to the real
`uuid` (or matches an existing DB row by `crn`, if you're pointing at an org
or fund that's already loaded, rather than re-declaring it here).

Every `*_ref` / `*_org_ref` / `*_fund_ref` / `*_programme_ref` /
`*_person_ref` column elsewhere points to one of those `ref_key`s. If the
target already exists in the database and you don't want to re-declare it,
you may instead put its known `crn` directly in the `*_ref` column, prefixed
`crn:` (e.g. `crn:01234567`) — this is the proposed convention for the future
loader; until then, resolve it yourself.

## Column conventions

- **Booleans** (`is_quilt_tagged`): `true` / `false`.
- **Dates** (`commit_date`, `round_date`, `notified_date`): `YYYY-MM-DD`.
- **`amount_gbp`**: plain number, no currency symbol or thousands separator.
  Leave blank rather than guessing — several real sources (e.g. SNIB) only
  disclose an aggregate across funds, not a per-commitment figure.
- **Exactly-one-of pairs** — leave the other column blank:
  - `investment`: `investor_org_ref` *or* `investor_fund_ref`, never both.
  - `person_role`: `fund_ref` *or* `org_ref`, never both.
  - `org_alias`: `org_ref` *or* `fund_ref`, never both.
- **Enums** — values are the exact DB enum members (`db/migrations/0001_extensions_and_types.sql`):
  - `org_kind`: `company`, `gp`, `government_body`, `pension_provider`, `other`
  - `confidence`: `high`, `medium`, `low`
  - `resolved_by` (`org_alias`): `crn_match`, `alias_table`, `manual_review` —
    hand-filled aliases are almost always `alias_table` (a known name variant)
    or `manual_review` (you resolved an ambiguous case yourself); `crn_match`
    is what an automated loader stamps when it resolves purely off a CRN match.
  - `control_nature` (`psc_control`) is free text, not an enum, but should use
    Companies House's own PSC vocabulary, e.g.
    `ownership-of-shares-25-to-50-percent`,
    `ownership-of-shares-50-to-75-percent`,
    `ownership-of-shares-75-to-100-percent`,
    `voting-rights-25-to-50-percent` (and the 50–75 / 75–100 variants),
    `right-to-appoint-and-remove-directors`, `significant-influence-or-control`.

## Before you load

Every file ships with one `EXAMPLE` row showing the expected shape — some
drawn from real, cited detail in [`docs/data-sources.md`](../../docs/data-sources.md)
(British Growth Partnership Fund I's first close and named LPs), the rest
(the portfolio company, the PSC individual, all `source_url` values) clearly
marked fictional/placeholder because the source docs don't name them.
**Delete the example rows before adding real data** — keep the header row.
