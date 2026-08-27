# lpinvestors — Investor Tracker

Public-sector LP intelligence: which government-backed investors put capital into which
funds, and which companies those funds (and those investors) hold stakes in.

This is the **Investor tracker**, one of five modules in a longitudinal intelligence
stack tracking frontier-technology policy through to grants, investment, and regulatory
support. It is a *proposed* (not yet built) component; the other four —
[QUILT](#sibling-modules), the funding stack analyser (`dtfunding`), Founderfluence, and
the (also-proposed) Policy tracker — are documented in the architecture briefing this
design is derived from.

**Scope, deliberately narrow:** not a general-purpose investor database. The universe is
investors holding stakes in companies QUILT has already tagged as frontier tech —
QUILT's ontology is the filter that keeps entity resolution bounded.

## Start here

- [`docs/DESIGN.md`](docs/DESIGN.md) — full design: entity schema, data sources, entity
  resolution approach, pipeline stages, integration contract, phased roadmap, open
  questions.
- [`docs/data-sources.md`](docs/data-sources.md) — catalog of every government LP source
  in scope, with confidence level and what's actually disclosed.
- [`schema/schema.sql`](schema/schema.sql) — draft DDL for the entity graph.

## The one-sentence architecture

> Entity resolution — collapsing name variants into one canonical investor ID — is the
> actual build. Everything else (cap-table extraction, government LP monitoring) reuses
> extraction that already exists or is well understood.

## Sibling modules

| Module | Status | Role |
|---|---|---|
| QUILT | Built | Innovate UK grant data, classified by a Deep Tech Ontology. Defines this module's company scope. |
| Funding stack analyser (`dtfunding`) | Built | Capital structure from Companies House filings (SH01/CS01/AR01). Source of cap-table extraction this module reuses. |
| Founderfluence | Built | Founder Mode framework tested against interviews/press. |
| Policy tracker | Proposed | Six-category policy taxonomy over strategy documents. Cross-references named leaders against this module's PSC/GP identities. |
| **Investor tracker** | **Proposed (this repo)** | Investor entity graph scoped to frontier-tech company stakes. |

All five resolve to a company via its **Companies House number** — the join key for the
"connecting repository" that turns five separate tools into one longitudinal panel.
