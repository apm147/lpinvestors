# Investor Tracker — Design

Status: initial design, not yet built. Synthesized from three source documents:
`investor-lp-research-findings-v2.md`, `deep-tech-stack-architecture.html`, and
`deep-tech-stack-briefing-notes.md` (26–27 Aug 2026). See [Open questions](#open-questions-for-the-user)
for what's still undecided.

## 1. Scope and non-goals

**In scope:** investor entities (individuals and vehicles) holding stakes in companies
that QUILT has already tagged as frontier tech, plus the government-backed LP
commitments that seed part of that investor base.

**Out of scope:**
- A general-purpose UK investor/cap-table database. Scope is bounded by QUILT's tagging,
  not by "every UK company."
- Grant data. QUILT/Innovation Funding Explorer owns that; this module reads it via a
  join on company number, never duplicates it.
- Non-UK-domiciled LP vehicles (offshore blind spot, §7). Private LP identities
  generally: UK limited partnership reform (ECCTA 2023) requires GP disclosure, not LP
  disclosure — private LPs stay off the public register regardless. This module can see
  government LPs (because they self-report) and cannot see most private LPs unless they
  self-disclose (e.g. Mansion House Accord signatories).
- Causal-inference methodology. This module produces the dataset the book's
  crowd-in/crowd-out and two-clock-mismatch analysis needs; the quasi-experimental
  technique itself is a separate, unaddressed capability gap.

## 2. Why entity resolution is the actual build

Both source extraction streams are solved or well-understood problems:

- **Cap tables** (company → investors): `dtfunding` already parses SH01/CS01/AR01 from
  Companies House. CS01 (Confirmation Statement), not SH01, is where shareholder
  identity actually surfaces — SH01 only confirms a round happened, not who took part.
  This module's addition is the PSC register, to unwind corporate GPs to the
  individuals behind them.
- **Government LP list** (government → funds): BBB, British Patient Capital, NSSIF,
  SNIB, etc. publish their own cornerstone commitments because they have their own
  reporting obligations. This is a monitoring problem, not an extraction problem.

What's genuinely hard is collapsing raw extracted names — "British Business Bank",
"BBB", "British Patient Capital", a fund's Companies-House-registered legal name that
doesn't match its trading name in press coverage — onto one canonical investor ID
without either (a) missing real matches or (b) false-merging two distinct entities. (b)
is the worse failure mode for a research/policy dataset: an uncertain match should stay
split rather than be force-merged. This is where build effort concentrates.

## 3. Entity/relationship schema

Four entity types, one resolution layer, relationships that carry the actual
intelligence.

### Entity types

| Type | Represents | Anchor / primary key | Notes |
|---|---|---|---|
| `ORG:` | GPs, LPs, government bodies, portfolio/founder companies | Companies House number (CRN) where available | One record type for both sides of the graph — a company can be a portfolio company in one relationship and a Funder in another. |
| `PERSON:` | PSC-disclosed individuals | Composite key: name + DOB month/year + nationality (mirrors how Companies House itself disambiguates PSCs — no stable person-ID exists) | Kept distinct from `ORG:` deliberately. PSC individuals are mostly founders/controlling shareholders (25%+ threshold), **not** the broader VC/LP population — conflating them with vehicle-type Funders would corrupt the graph's meaning. |
| `FUND:` | Fund vehicles (the GP-managed vehicle itself, distinct from its GP and its LPs) | CRN where the fund is a registered UK limited partnership; alias-resolved otherwise | Secondary record — explains *how* a Funder's capital reached a company, not a full profile subject in its own right (LP-primary framing, §4). |
| `PROGRAMME:` | Government programmes / sub-funds (British Patient Capital, British Growth Partnership, ECF, NPIF II, MEIF II, NSSIF, Investor Pathways Capital) | Own `ORG:`-linked row per programme | "BBB" is not one umbrella — each sub-programme is tracked separately, own disclosure surface, own cadence, even sharing a parent and domain. |

### Relationship types

| Relationship | From → To | Source | Notes |
|---|---|---|---|
| `COMMIT:` | Funder (`ORG`/`PROGRAMME`) → `FUND` | Govt LP list monitoring; press | LP commitment. Amount + date where disclosed (often absent, e.g. SNIB aggregate-only). |
| `invests_in` | `FUND` or direct-investing `ORG` → portfolio `ORG` | Cap-table extraction (CS01 deltas timed against SH01 rounds) | The company-side signal. |
| `PSC_of` | `PERSON` → `ORG` | PSC register | Significant control (≥25% shares/votes, or board-appointment right, or other significant influence). |
| `officer_of` / `GP_of` | `PERSON` → `FUND`/`ORG` | PSC + CS01 | Unwinds corporate GPs to the individuals behind them (briefing note, linkage 03). |
| `alias_of` | raw extracted name → canonical `ORG:`/`FUND:` id | Entity resolution alias table | Not a graph-visible relationship; internal to resolution. |

### Entity resolution algorithm (priority order)

1. **Companies House number match** — primary key wherever a filing provides one.
   Covers most of the "vehicle" side automatically.
2. **Maintained alias table** — subsidiary/trading-name problem. British Patient
   Capital and British Growth Partnership are both BBB-run but appear under their own
   names in most sources; the alias table maps surface-form names to canonical IDs.
3. **Manual review queue (fallback)** — anything that doesn't resolve automatically.
   An uncertain match stays split rather than being force-merged; false merges are more
   damaging to this dataset than a duplicate row.

### What's explicitly *not* modeled here

Grant data (QUILT/Innovation Funding Explorer) is **read access only**, keyed by the
same `ORG:` id — never a duplicated copy. QUILT's existing company lookup (which
already searches both Innovate UK grant recipients and Companies House data) may
overlap with what the cap-table stream needs; treat as reusable infrastructure, not a
rebuild target.

## 4. Pipeline

```
 Cap tables (SH01+CS01+PSC)       Govt LP list (BBB, NSSIF, + queued sources)
            \                              /
             \                            /
              v                          v
                 Entity resolution
              (canonical investor IDs)
                        |
                        v
              Investor graph
            (individuals & vehicles)
                        |
                        v
             Govt-backed cascade
           (portfolio vs. grant list —
          read-join against QUILT on CRN)
                        |
                        v
            Crowd-in/out by channel
        (per company: grant / govt equity /
               both / neither)
```

Build/reuse status per stage:

| Stage | Status | What it needs |
|---|---|---|
| Cap tables | Reuse | `dtfunding`'s existing SH01/CS01/AR01 extraction, scoped to QUILT-tagged companies; add PSC register parsing. |
| Govt LP list | New, but monitoring not extraction | Per-programme disclosure monitors — see [`data-sources.md`](data-sources.md). Each source ships on its own page/cadence; no single BBB-site monitor is sufficient. |
| Entity resolution | **New — the actual build** | CH-number matching, alias table, manual review queue/UI. |
| Investor graph | New (thin layer) | Materialized view over resolved entities + relationships. |
| Govt-backed cascade | New (thin layer) | Join query against QUILT's grant list on CRN. No data ownership. |
| Crowd-in/out by channel | New (thin layer) | Per-company classification: grant-only / govt-equity-only / both / neither. This is the module's actual output. |

## 5. Integration contract with sibling modules

- **Join key:** Companies House number. `dim_participant.crn` in QUILT, `companies.id`
  in `dtfunding`, same key here.
- **QUILT → Investor tracker (scoping):** QUILT's frontier-tech tags define which
  companies' investor bases get resolved at all. Not "all UK investors."
- **`dtfunding` → Investor tracker (shared extraction):** reuse, don't reimplement,
  the SH01/CS01/AR01 parsing; add PSC on top.
- **Investor tracker ↔ Policy tracker (named leaders):** once the Policy tracker exists,
  its natural-person table for named policy leaders should resolve against this
  module's PSC/GP `PERSON:` identities — surfaces people who sit on both sides of
  policy and capital. Deferred until the Policy tracker is built; the `PERSON:` schema
  here should stay compatible with that eventual join (same composite key strategy).
- **Investor tracker → QUILT (grant join, read-only):** the govt-backed cascade and
  crowd-in/out stages query QUILT's grant list by `ORG:` id; they do not copy it.

## 6. Outputs

- **Advisory outputs** — due diligence and policy guidance (near-term application).
- **Book empirical spine** — the crowd-in/crowd-out test and two-clock-mismatch
  validation dataset. (The causal-inference technique itself is out of scope, see §1.)

## 7. Confidence and known gaps (carried from research findings)

**High confidence:** BGP's LP roster and BBB's Tapestry commitment (direct press/
primary release); SH01/CS01/PSC disclosure mechanics; QUILT = Innovation Funding
Explorer (confirmed); BBB sub-programmes needing separate tracking (confirmed).

**Medium confidence:** SNIB's portfolio list (own-site disclosure, not independently
cross-checked); NSSIF's joint-initiative relationship to BBB (governance detail thin).

**Low confidence / accepted gaps:** NSSIF portfolio or commitment data (none found —
weakest-sourced entry despite being named in the pipeline); NPIF II/MEIF II
fund-of-funds structure; current ECF fund-manager roster; whether National Wealth Fund
makes any LP-style commitments at all (it leans direct equity/debt).

**Two flags to carry into every phase of the build:**

1. **LP disclosure timing.** ECCTA 2023 reforms are phasing in through 2026. Historical
   filings stay thin; anything filed forward should improve. The module is being built
   right as the underlying data gets better, not after.
2. **Offshore blind spot.** Non-UK-domiciled LP vehicles (common for pension-fund LPs,
   often Jersey/Guernsey) won't appear in Companies House. The government-LP cascade is
   largely insulated (BBB discloses its own commitments regardless of fund domicile); a
   complete picture of *all* private LPs is not achievable through this route alone.

## 8. Phased roadmap

| Phase | Deliverable | Depends on |
|---|---|---|
| 0 | This design + schema + data-source catalog | — |
| 1 | Entity resolution core: CH-number matching + alias table + canonical `ORG:`/`FUND:` IDs | Schema finalized |
| 2 | Seed govt LP list from high-confidence sources (BBB/BPC, BGP Fund I) | Phase 1 |
| 3 | Cap-table integration: reuse `dtfunding` SH01/CS01 extraction, add PSC, scope to QUILT-tagged companies | `dtfunding` access; QUILT tag list |
| 4 | Govt-backed cascade join + crowd-in/out-by-channel output | Phases 2 & 3; QUILT read access |
| 5 | Expand govt LP sources as they resolve: SNIB, NWF, ECF roster, NPIF II/MEIF II | Ongoing monitoring |
| 6 | Policy tracker cross-reference (named leaders ↔ PSC/GP identities) | Policy tracker module built |
| 7 | Manual-review UI for entity resolution edge cases | Phase 1 in production with a real backlog |

Phases 1–4 are the module's MVP: they alone produce the crowd-in/out output that's the
whole point of the pipeline. Phase 5 is ongoing background work, not a blocker.

## 9. Open questions for the user

Design decisions I made a default call on rather than blocking on — flag if any should
change:

1. **Tech stack.** Assumed **Postgres + Python**, matching QUILT's stated "Postgres
   dimensional model" and `dtfunding`'s Companies House filing parsing. Not confirmed
   for this repo specifically — is there a stack `dtfunding`/QUILT actually use that
   this module should match exactly (ORM, migration tool, language), or is this repo
   free to choose?
2. **Repo/data boundary.** Does `dtfunding`'s SH01/CS01/PSC extraction live in a
   repo this module can import or call directly, or does the govt LP list build reuse
   it. There's actual code to reuse, or is "reuse" here closer to "the parsing logic
   from `dtfunding` should be reimplemented against a copy" — worth confirming access
   before Phase 3.
3. **QUILT access.** Same question for QUILT's grant list and tagged-company scope —
   direct DB/API read access, or an export the tracker needs to ingest.
4. **Manual review UI, phase 7.** Worth a lightweight internal tool from the start, or
   is a flagged-rows table + spreadsheet export sufficient until the resolution
   backlog is large enough to justify UI work?
5. **NSSIF gap.** Research findings treat this as "accepted gap, expected to resolve
   over time." Confirm that's still fine, or is NSSIF's inclusion in the pipeline
   diagram signal that it needs a dedicated sourcing push sooner (e.g. individual deal
   press coverage rather than institutional pages).
