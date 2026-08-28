# Data entry templates

CSV templates for hand-populating the investor graph — one file per table in
[`db/migrations/`](../migrations), matching its columns exactly. These currently
carry the first real Phase 2 seed data (docs/DESIGN.md #8: "seed govt LP list
from high-confidence sources — BBB/BPC, BGP Fund I") rather than a placeholder
example — see [Current seed data](#current-seed-data) below. Append further
rows the same way as you source more (government LP list monitoring, cap-table
extraction), then load them into `lpinvestors_test` / the production database.

**Load them with `npm run db:seed`** (runs [`scripts/seed-from-templates.ts`](../../scripts/seed-from-templates.ts)
against `$DATABASE_URL`, in the file order below, inside one transaction).
Add `-- --dry-run` to resolve and validate everything — including every
DB-side FK/enum/CHECK constraint — without writing anything:

```bash
npm run db:seed -- --dry-run   # validate only
npm run db:seed                # commit for real
```

It's a plain loader, not an upsert: re-running it against data that's
already loaded will fail (most likely on `org`'s `crn` or `programme`'s
`name` uniqueness) and roll back the whole batch atomically — nothing
partially written. Matching a new raw name against an entity that may
already exist is the harder problem entity resolution proper is for
(docs/DESIGN.md #3); this loader only knows the ref_keys and `crn:` lookups
you give it explicitly.

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
put its known `crn` directly in the `*_ref` column instead, prefixed `crn:`
(e.g. `crn:01234567`) — the loader looks it up by `crn` rather than creating
it. `crn:` lookups only work for `org` and `fund` (the only tables with a
`crn` column); there's no natural key to look up an existing `person` or
`programme` by, so those must always get a fresh `ref_key` row here.

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

## Current seed data

5 orgs, 2 programmes, 2 funds, 4 commitments, 1 investment, 2 aliases — every
`source_url` is a live, real citation (mostly the British Business Bank's own
press releases), found via web search in the session that populated this and
cross-checked against multiple independent outlets (UKTN, Pensions Expert,
IPE, Pensions Age) rather than fetched and read directly — the primary-source
pages themselves weren't reachable from that session's network, so **spot-check
the two BBB URLs below before treating figures as final**:

- **BPC → Tapestry VC Fund III**: £40m cornerstone commitment, 1 Jul 2026.
- **BGP Fund I**: £200m first close, 1 Apr 2026, named LPs Aegon UK, NatWest
  Cushon, M&G — no per-LP amount disclosed (`amount_gbp` left blank on all
  three, honestly — not a gap in this template).
- **BGP Fund I → Wayve**: its first investment, £8m of BBB's wider £25m
  Wayve round (1 Apr 2026) — the one non-empty `investment` row currently
  here. `v_govt_backed_cascade` correctly returns nothing for it, since
  `org.is_quilt_tagged` for Wayve is left `false` — that flag is meant to
  come from a QUILT read-join (docs/DESIGN.md #3) this repo doesn't have
  built yet, not something to assert by hand.
- **`org_alias`**: `"BBB"` → British Business Bank, and `"Cushon Master
  Trust"` → NatWest Cushon — a real instance of the exact name-variant
  problem entity resolution exists to solve (BBB's own release says
  "NatWest Cushon"; three other outlets independently call the same entity
  "Cushon Master Trust").

Known gaps, left blank rather than guessed: BBB's and Wayve's own `crn`,
Tapestry VC's `gp_org_id` (its GP entity isn't modeled as an `org` here),
and no PSC/`person` data at all — none was in scope for this pass.

Every new row you add the same way: give it a `ref_key`, use `crn:...` only
once the target already exists in the live DB, and cite a real `source_url`
— never a placeholder that looks like one.
