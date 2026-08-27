# Government LP data sources

Every source feeding the "Govt LP list" side of the entity resolution pipeline. **"BBB"
is not one umbrella** — each row below needs its own tracked disclosure surface and its
own update cadence, even where several share a parent institution and web domain.

| Source | Relationship to BBB | Confidence | What's actually disclosed | Status |
|---|---|---|---|---|
| **British Business Bank (BBB)** | Parent institution | High | Runs the programmes below; press releases for major commitments. | Active source |
| **British Patient Capital** | BBB's VC/growth-equity arm | High | Direct cornerstone LP commitments. Confirmed: £40m into Tapestry VC Fund III, 1 Jul 2026. | Active source |
| **British Growth Partnership (BGP) Fund I** | BBB-managed fund-of-funds | High | First close £200m, 1 Apr 2026. Named LPs: Aegon UK, NatWest Cushon, M&G; London CIV in discussion. Under LP-primary framing these pension providers are themselves `Funder` rows. | Active source |
| **Enterprise Capital Funds (ECF)** | BBB sub-programme | Unresolved | Current fund-manager roster not yet established. | Queued — surfaces via cap-table pipeline or routine BBB monitoring; no dedicated push planned |
| **Nations and Regions Investment Funds (NPIF II, MEIF II)** | BBB sub-programme | Unresolved | Whether they operate as fund-of-funds with named external GPs is unconfirmed. | Queued — same as ECF |
| **National Security Strategic Investment Fund (NSSIF)** | "Joint initiative between the Government and the British Business Bank" | **Low — weakest-sourced entry despite being named in the pipeline diagram** | No portfolio, fund-commitment, or amount disclosure found on nssif.gov.uk or the BBB NSSIF page. Backs dual-use technologies for national security/defence. | Accepted gap — worth a dedicated search on individual-deal press coverage (not institutional pages) if it becomes a near-term blocker |
| **Scottish National Investment Bank (SNIB)** | Independent (not a BBB entity) | Medium | Publishes an actual fund-level portfolio: Epidarex Capital Fund IV, Social and Sustainable Capital, Thriving Investments. £1.15bn aggregate, no per-fund amounts. Own-site disclosure, not independently cross-checked. | Queued — not deliberately excluded from the pipeline diagram, just not yet added |
| **National Wealth Fund (NWF)** | Independent (formerly UK Infrastructure Bank) | Medium | £27.8bn capitalisation. Leans direct equity/debt rather than LP-into-fund commitments — unconfirmed whether it makes any LP-style commitments at all. | Queued — same caveat as SNIB |
| **Investor Pathways Capital programme** | BBB subsidiary (named in architecture briefing's cascade description, not yet researched in depth) | Unresolved | Not yet researched. | Not yet added — flagged here so it isn't dropped |

## Why this can't be one monitor

BBB, British Patient Capital, British Growth Partnership, and the sub-programmes above
share a parent institution and a web domain, but each publishes on its own page, its own
cadence, and (per NSSIF vs. BGP) wildly different disclosure depth. A single BBB-site
crawl would catch BGP's named-LP press release and miss NSSIF's near-total silence
looking the same as "nothing new happened." Each row in this table needs its own tracked
surface in the govt-LP-list monitor, even though the entity schema already treats each
as its own `ORG:`/`PROGRAMME:` row (see [`DESIGN.md`](DESIGN.md#3-entityrelationship-schema)) —
this is a data-collection correction, not a schema one.

## Private / non-government LPs

Not sourced through this monitor at all, and structurally can't be in general: UK
limited partnership reform (ECCTA 2023) requires GP disclosure, not LP disclosure —
private LP identities stay off the public register regardless of reform. Private
co-investors sitting alongside BBB or NSSIF in the same fund stay invisible unless they
self-disclose (e.g. Mansion House Accord signatories, or BGP's named pension LPs, which
disclosed voluntarily). This module surfaces private LPs only when they self-disclose
this way — never as a monitored source in their own right.
