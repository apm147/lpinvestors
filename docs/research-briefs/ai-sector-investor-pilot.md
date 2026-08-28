# Investor research pilot — AI sector (Cowork prompt)

A prompt to paste into Claude Cowork to run a small, source-grounded research
pass populating `db/templates/*.csv` with real investor data for the AI
sector. First of what should become one brief per sector as `lpinvestors`
gets built out (docs/DESIGN.md's Phase 3/4 scope is company-by-company; this
is the bottom-up complement to the top-down govt-LP seeding already done).

Pilot size is deliberately small (~12-15 companies) — the point isn't
coverage yet, it's finding out empirically how often the same investor shows
up under different names across sources, which is the actual size of the
Phase 1 entity-resolution problem this project keeps deferring on faith.

---

## The prompt

```
You're doing targeted investor research for apm147/lpinvestors, a Postgres-backed
investor graph tracking which investors (VCs, corporates, government bodies, PSC
individuals) hold stakes in UK frontier-tech companies. This is a pilot: ~12-15
real UK companies in the AI sector, researched for their actual investor base,
formatted into this repo's CSV seed templates.

STEP 0 — READ FIRST (don't skip, the conventions below are a condensed copy that
may drift out of date):
- db/templates/README.md — the full CSV format: the ref_key convention, the
  crn: lookup convention, exactly-one-of column pairs, enum values, date/boolean/
  amount formatting.
- The current db/templates/*.csv files themselves — so you don't collide with
  existing ref_keys, and so you can see what's already loaded: British Business
  Bank, British Patient Capital, British Growth Partnership Fund I, its LPs
  (Aegon UK, NatWest Cushon, M&G), and one portfolio company, Wayve (org_wayve),
  which already has a stub investment row (BGP Fund I's £8m into it).
- docs/DESIGN.md §3 (entity/relationship schema) and §7 (confidence levels).
- docs/data-sources.md — the government LP sources already covered. Don't
  re-research these; this pilot is the company-side complement to that.

STEP 1 — PICK ~12-15 COMPANIES:
UK-incorporated, genuinely in the AI sector. The scoping test this project's
sibling module QUILT actually applies isn't "well-known AI company" — it's
whether the company shows up in Innovate UK's funded-projects dataset and gets
classified by QUILT's Deep Tech Ontology. Neither of us has live query access to
QUILT right now, so approximate that test rather than ignoring it: bias toward
companies you can independently confirm received Innovate UK / UKRI / Smart
Grants / Catapult funding or an SBRI competition award (search "<company>
Innovate UK", or check the source data at
https://www.ukri.org/publications/innovate-uk-funded-projects-since-2004/ if you
can reach it), over companies that are simply well-known. This makes the pilot's
output far more likely to actually be in-scope once real QUILT access exists.

Include Wayve as one of the 12-15 — it's already a stub in the files (org row
ref_key org_wayve, one investment row). Research its full investor base as a
cross-check on what's already there; reference it by its existing ref_key (or a
crn: lookup once you have its real CRN), don't create a duplicate org row for it.

STEP 2 — FOR EACH COMPANY, RESEARCH AND RECORD ONLY REAL, CITED DATA:
- org row: canonical_name, crn (look it up on Companies House —
  find-and-update.company-information.service.gov.uk — get the real 8-digit
  number), org_kind='company'. Leave is_quilt_tagged=false regardless of how
  confident you are — per docs/DESIGN.md this flag is meant to come from an
  actual QUILT join, not a manual judgment call. If you're highly confident a
  company would qualify, say so in your summary instead, as a flag for whoever
  has real QUILT access to confirm.
- Investors: for each VC/PE/corporate/government investor you find, an org (or
  fund, if it's a specifically named fund vehicle rather than the managing
  firm) row — canonical_name, crn if it's a UK-registered vehicle, org_kind —
  plus a commitment or investment row linking it to the company (see
  docs/DESIGN.md §3 for which relationship table fits which case: LP-into-fund
  is `commitment`, fund-or-org-into-company is `investment`).
- PSC individuals (>=25% control) via the company's Companies House PSC
  register tab, where present — person + psc_control rows.
- Where the same investor appears under different name spellings across your
  sources (abbreviation vs. full legal name, a fund vs. its manager, etc.),
  record it as ONE org row plus an org_alias row for the variant — do not
  create two org rows. Note every such case in your summary; this is exactly
  the signal this pilot exists to surface.

SOURCING RULES (from apm147/dtfunding's db/PUBLIC_SOURCES.md — read it if you
have access; condensed here if not):
- confidence=high: Companies House core/PSC/SH01 register, the Gazette
  (London/Edinburgh/Belfast), FCA National Storage Mechanism, LSE/AIM RNS, CMA
  merger inquiries register, or the company's/investor's own press release.
- confidence=medium: credible trade press (Sifted, UKTN, Tech.eu, TechCrunch,
  Business Cloud, national business press) naming a specific investor/amount.
- Never fabricate or guess a source_url, a CRN, or an amount. If you can't find
  a citable source for a fact, leave the fact out — an omitted row is fine, a
  fabricated one is not. amount_gbp is very often genuinely undisclosed; leave
  it blank rather than estimating.

WHAT NOT TO DO: don't try to reach QUILT's or dtfunding's live databases —
neither is reachable from a research session and neither is needed for this
pass. This is standalone public-web research, cross-referenced against what's
already in this repo's CSVs.

DELIVERABLE:
(a) The new rows to append to each db/templates/*.csv file, as fenced code
    blocks, one per file (include the header row for clarity even though
    you're appending).
(b) A short pilot-findings summary: how many of the 12-15 companies yielded at
    least one real, cited investor; how many name-variant/alias collisions you
    hit and what they were; which companies came up empty and why; your read
    on how big the entity-resolution problem looks at this scale.
(c) If you have push access to apm147/lpinvestors: create a branch (e.g.
    claude/investor-pilot-ai-sector), commit the CSV additions, run
    `npm run db:seed -- --dry-run` (documented in db/templates/README.md) to
    self-validate against the real schema before finishing, and open a PR.
    If you don't have push access: just return (a) and (b) above.
```
