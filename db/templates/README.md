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

**A third option, for `org`/`fund` only: just use the real name.** If a
`*_org_ref` / `*_fund_ref` value isn't a `ref_key` in the current batch and
isn't a `crn:` lookup, the loader falls back to matching it against the
database's `canonical_name` values, then the `org_alias` lookup table —
so "Draper Esprit" resolves to Molten Ventures without you needing to know
that's the ref_key or CRN it was loaded under. This is the actual point of
`org_alias`: a name resolved once (by a prior batch, or by hand) doesn't need
re-resolving by hand every time it recurs — see `src/lib/entity-resolution.ts`
for the same lookup used by the app, and `scripts/seed-from-templates.ts`'s
`RefResolver.resolveByName` for this loader's copy of it. Only an exact,
case-sensitive match counts; if nothing matches, you still get a clear error
naming the unresolved value, not a silently-created duplicate.

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

Two batches, both real and cited, no placeholder rows left:

**Govt LP seed** (top-down) — British Business Bank, British Patient Capital →
Tapestry VC Fund III (£40m), British Growth Partnership Fund I's £200m first
close (LPs Aegon UK, NatWest Cushon, M&G, no per-LP amount disclosed). See git
history on this file for the original citations.

**AI-sector investor pilot** (bottom-up, `docs/research-briefs/ai-sector-investor-pilot.md`)
— company-centric cap-table research for ~13 UK AI companies (Wayve, Riverlane,
Congenica, Ieso, Exscientia, Featurespace, Oxa/Oxbotica, Five AI, Kheiron/
DeepHealth UK, Mind Foundry, Advai), run via Cowork against the prompt in that
brief. 111 orgs, 5 funds, 4 PSC individuals, 109 investment rows, 15 aliases.
`is_quilt_tagged` is left `false` throughout, same reasoning as before — none
of these companies' QUILT status has been confirmed against a live join.

Two things worth knowing before querying this data:

- **Wayve's Feb 2026 mega-round is recorded as two investment rows that
  overlap, not two separate slices of capital**: `British Growth Partnership
  Fund I → Wayve` (£8m, from BBB's own 1 Apr 2026 release) and `British
  Business Bank → Wayve` (from TechCrunch's coverage of the same round,
  reporting BBB's total ~£25m without breaking out the BGP-specific portion).
  The `source_filing` on the BGP row says so explicitly — **don't sum both
  when totaling round capital**, the £8m is a subset of the £25m, not
  additional to it.
- Several `org_alias` rows here resolve a **legal restructuring**, not just a
  spelling variant — Draper Esprit → Molten Ventures (a 2021 rebrand),
  Touchstone Innovations / Imperial Innovations Group → IP Group (a historical
  merger). Distinct from cases like `org_exscientia_ltd` vs `org_exscientia_ai`
  or `org_ieso` vs `org_ieso_uk_sub`, which are real, currently-distinct legal
  entities (different CRNs, parent vs. UK subsidiary) correctly kept as
  separate `org` rows rather than aliased together.

Every new row you add the same way: give it a `ref_key` unique across the
whole file (not just your own batch), use `crn:...` only once the target
already exists in the live DB, and cite a real `source_url` — never a
placeholder that looks like one.
