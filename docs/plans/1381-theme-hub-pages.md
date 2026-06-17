# Theme Hub Landing Pages Plan

**Issue**: [#1381](https://github.com/eserlan/Codex-Cryptica/issues/1381)  
**Status**: Planning  
**Date**: 2026-06-17

## Goal

Add per-theme hub landing pages at `/generators/[theme]` — one rich page per theme that collects all relevant generators, pre-selects the theme via `localStorage`, and gives search engines a strong "{theme} RPG generators" landing page for high-intent queries.

## Decisions

| Question                | Decision                                                                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme slugs             | `fantasy`, `cyberpunk`, `sci-fi`, `post-apocalyptic`, `modern`, `vampire`                                                                                                   |
| Cards on fantasy hub    | All 9 generators (6 parametric + magic-item, kingdom, pantheon/god)                                                                                                         |
| Cards on all other hubs | Same 6 parametric generators (NPC, faction, quest, names, settlement, nation)                                                                                               |
| Theme hand-off          | Write `codex-cryptica-active-theme` to `localStorage` on card click, then navigate — consistent with existing generator page behaviour                                      |
| Canonical strategy      | Flat generator slugs (`/generators/npc` etc.) keep their own canonicals for now; hub canonicals are self-referencing. Consolidation of flat-page canonicals is a follow-on. |

## Non-Goals

- No new generator logic — hubs are landing/linking pages only.
- No 301 redirects from existing flat slugs.
- No full theme×type matrix (doorway-page risk).
- No server-side theme persistence.

## Theme → localStorage ID mapping

Derived from `themeIdToLabel` in `packages/generator-engine/src/public-faction.ts`:

| Slug               | localStorage value |
| ------------------ | ------------------ |
| `fantasy`          | `fantasy`          |
| `cyberpunk`        | `cyberpunk`        |
| `sci-fi`           | `scifi`            |
| `post-apocalyptic` | `apocalyptic`      |
| `modern`           | `modern`           |
| `vampire`          | `horror`           |

## Phase 1 — Route scaffold

- [ ] Create `apps/web/src/routes/(marketing)/generators/[theme]/+page.ts`
  - Valid themes set: `fantasy`, `cyberpunk`, `sci-fi`, `post-apocalyptic`, `modern`, `vampire`
  - `prerender = true`
  - `entries()` returning all 6 theme slugs
  - `load()` returning the theme param (404 on unknown)
- [ ] Create `apps/web/src/routes/(marketing)/generators/[theme]/+page.svelte` (stub — hero + empty card grid)
- [ ] Verify all 6 routes render without error locally

## Phase 2 — Theme config + card data

- [ ] Define a `themeConfig` map in the page (or a co-located `.ts` file) keyed by slug, each entry containing:
  - `label` — display name (e.g. "Cyberpunk")
  - `localStorageId` — value to write to `codex-cryptica-active-theme`
  - `eyebrow` — short genre descriptor (e.g. "Neon & Megacorps")
  - `intro` — 2–3 sentence hub description
  - `metaTitle` / `metaDescription` — page-level SEO strings
- [ ] Define the card list per theme (fantasy: 9 cards, all others: 6 cards), each card containing:
  - `slug` — target `/generators/[slug]`
  - `label`, `summary`, `icon` — same shape as the generator index cards
- [ ] Wire card click: `onclick` writes `localStorage.setItem("codex-cryptica-active-theme", localStorageId)` then lets the `<a>` navigate normally

## Phase 3 — Page markup + SEO

- [ ] Hero section: eyebrow, h1, intro copy
- [ ] Card grid matching the style of `/generators` index (`border-theme-border/60`, hover states, icon + label + summary)
- [ ] `<svelte:head>`: `<title>`, `<meta name="description">`, `<link rel="canonical">`, JSON-LD `ItemList`
- [ ] Breadcrumb JSON-LD: Codex Cryptica → Generators → {Theme} Hub
- [ ] Link back to `/generators` index

## Phase 4 — Register in index + sitemap

- [ ] Add a "Theme Hubs" section to `/generators` index page listing all 6 hubs
- [ ] Add the 6 `/generators/[theme]` URLs to `apps/web/src/routes/sitemap.xml/+server.ts` (priority `0.8`, changefreq `monthly`)

## Phase 5 — Tests

- [ ] Unit test: `+page.ts` load returns correct slug, 404s on unknown theme
- [ ] E2E smoke test (`tests/generator-theme-hubs.spec.ts`): visit each hub, verify h1 is visible and card grid renders
- [ ] E2E: clicking a card sets the correct `localStorage` value before navigation
