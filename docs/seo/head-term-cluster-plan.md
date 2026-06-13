# Head-Term SEO/LLM Plan: "RPG Campaign Manager" + "Worldbuilding Tool"

Refines and extends [#1156](https://github.com/eserlan/Codex-Cryptica/issues/1156)
("Create campaign manager and worldbuilding SEO topic clusters").

## Strategy

The **homepage (`/`)** is the authority target for both bare head terms —
"RPG campaign manager" and "worldbuilding tool" — winning them via authority,
on-page signals, and inbound anchor text. Every cluster page becomes a
**differentiated spoke** that:

1. Targets a distinct _modifier_ intent (free / ai / offline / local-first / graph).
2. Links **up** to `/` with exact head-term anchor text.
3. Is unique vs its siblings (no thin duplicates).

### Why this matters now (diagnosis)

- **Cannibalization:** `/solutions/campaign-manager` ("Best Free RPG Campaign
  Manager") and `/free-rpg-campaign-manager` ("Free RPG Campaign Manager") fight
  for the same intent. No page cleanly owns the bare term.
- **Homepage gaps:** title targets the _AI_ variant only
  (`+layout.svelte:10`), H1 is "Private RPG Lore Vault" (contains neither head
  term), no `<link rel="canonical">`, schema doesn't assert both categories.
- **Weak authority links:** clusters are only linked from tools/generators
  pages, not from homepage/nav/footer with head-term anchor text.

Infra is already in place: `SoftwareApplication` + `FAQPage` JSON-LD and
canonical handling in `SEOPageLayout.svelte`, sitemap exposure, and
`llms.txt` / `llms-full.txt`.

---

## Phase 1 — Homepage dual-authority targeting (highest leverage)

Smallest, lowest-risk change; ~80% of the head-term win. Do first, standalone.

- [x] Update title/meta to lead with both categories, e.g. _"Codex Cryptica —
      Local-First RPG Campaign Manager & Worldbuilding Tool"_ (`+layout.svelte:10-12`,
      or an explicit homepage `<title>` in `(app)/+page.svelte` `<svelte:head>`).
- [x] Add a keyword **subhead/H2** + quotable first sentence containing both
      exact phrases. Keep the brand H1 ("Private RPG Lore Vault") — do **not**
      keyword-stuff the H1 (UX/brand tension).
- [x] Add `<link rel="canonical" href="https://codexcryptica.com/">`.
- [x] Extend homepage `SoftwareApplication` JSON-LD to name both
      `applicationCategory` angles; optionally add a small `FAQPage`
      ("What is an RPG campaign manager?" / "...worldbuilding tool?").
- [x] Curl-smoke `/` to confirm title, subhead, canonical, and schema render
      server-side.

## Phase 2 — De-cannibalize & differentiate the campaign manager cluster

Pages: `/solutions/campaign-manager`, `/free-rpg-campaign-manager`,
`/ai-rpg-campaign-manager`, `/solutions/offline-rpg-campaign-manager`,
`/solutions/local-first-rpg-campaign-manager`.

- [x] Retitle `/solutions/campaign-manager` off "Best Free…" → features/how-to
      solution angle (stops fighting homepage + `/free-`).
- [x] Lock intents: `/free-` = no-account/privacy, `/ai-` = AI prep/generation,
      `/solutions/offline-` = offline, `/solutions/local-first-rpg-campaign-manager`
      = data ownership.
- [x] Ensure each has unique title, meta, H1, body copy, examples, FAQ, CTA.
- [x] Each spoke links up to `/` with "RPG campaign manager" anchor text.
- [x] Cross-link to relevant blog posts, comparison pages, and generator pages.

## Phase 3 — De-cannibalize & differentiate the worldbuilding tool cluster

Pages: `/worldbuilding-tool`, `/solutions/worldbuilding-tool`,
`/solutions/ai-worldbuilding-tool`, `/solutions/local-first-worldbuilding-tool`,
`/solutions/rpg-knowledge-graph`.

- [x] Lock intents: `/worldbuilding-tool` = broad entry,
      `/solutions/worldbuilding-tool` = structured use-case,
      `/solutions/ai-worldbuilding-tool` = AI lore generation/refinement,
      `/solutions/local-first-worldbuilding-tool` = privacy/local vault,
      `/solutions/rpg-knowledge-graph` = graph/entity relationships.
- [x] Ensure each has unique title, meta, H1, body copy, examples, FAQ, CTA.
- [x] Each spoke links up to `/` with "worldbuilding tool" anchor text.
- [x] Cross-link to graph, Oracle, canvas, templates, and generator content.

## Phase 4 — Authority internal links

- [x] Add homepage / nav / footer links into both hubs with exact-phrase anchor
      text.
- [x] Add links from the `vs` comparison pages into the relevant cluster pages.

## Phase 5 — GEO / LLM polish

- [x] Update `static/llms.txt` so `/` is the clear primary entry for both
      categories.
- [x] Make every FAQ answer self-contained / quotable (answer-engine friendly).
- [x] Align each page's `relatedLinks` with the hub-and-spoke graph.

## Phase 6 — Verify & close #1156

- [ ] Manual crawler smoke test (curl static HTML) confirms definition sentence + FAQ + schema on every URL.
- [ ] Tick off all #1156 acceptance criteria for both clusters.

---

## Sequencing

1. **Phase 1** alone (fast, high-leverage).
2. **Phases 2–3** (bulk content work across 10 pages).
3. **Phases 4–5** (quick once the page set is settled).
4. **Phase 6** (verification gate before closing #1156).
