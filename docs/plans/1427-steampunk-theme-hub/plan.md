# Steampunk Theme Hub & Generator Expansion (Issue 1427)

## Overview

Add Steampunk as a new theme hub in Codex Cryptica, with generator genre support across all public generators.

## Phases and Tasks

### Phase 1: Generator Engine Expansion (Can run parallel with Phase 2)

Add "Steampunk" vocabulary pools to the public generator files using the existing `byGenre` pattern.

- **Task 1.1:** Update `packages/generator-engine/src/public-npc.ts` with Steampunk ancestries, roles, moralities, and names.
- **Task 1.2:** Update `packages/generator-engine/src/public-faction.ts` with Steampunk faction types, scopes, and alignments.
- **Task 1.3:** Update `packages/generator-engine/src/public-quest.ts` with Steampunk genres, tones, threats, twists, and locations.
- **Task 1.4:** Update `packages/generator-engine/src/public-social-hub.ts` with Steampunk venue types, clientele, and atmosphere.
- **Task 1.5:** Update `packages/generator-engine/src/public-nation.ts` with Steampunk polity types.
  _(Note: Settlement generator already contains Steampunk pools)_

### Phase 2: CSS Theme Definition (Can run parallel with Phase 1)

Implement the visual styling for the Steampunk theme.

- **Task 2.1:** Create `steampunk` and `steampunk_dark` theme entries in `packages/schema/src/theme.ts`.
- **Task 2.2:** Add CSS variables for the Steampunk theme in `apps/web/src/app.css` (using brass/amber palettes and gear motifs).

### Phase 3: Hub Setup & Routing (Depends on Phase 1 & 2)

Wire the theme and generators together into the frontend.

- **Task 3.0 (gating — do first):** Register `"steampunk"` as a valid hub route in two places:
  - Add `"steampunk"` to `VALID_HUB_THEMES` in `apps/web/src/params/theme_hub.ts` (the param matcher — without this the route returns 404). ✅
  - Add `"steampunk"` to the `ThemeSlug` type union and the `entries()` array in `apps/web/src/routes/(marketing)/generators/[theme=theme_hub]/+page.ts` (required for prerendering). ✅
- **Task 3.1:** Create the new hub page configuration in `apps/web/src/routes/(marketing)/generators/[theme=theme_hub]/+page.svelte` (add `steampunk` block to `themeConfig` with label, eyebrow, intro, metaTitle, metaDescription, and card list). ✅
- **Task 3.2:** Wire up Steampunk in the genre mappers:
  - Add `"steampunk": "Steampunk"` to `HUB_THEME_TO_GENERATOR_GENRE` in `apps/web/src/routes/(marketing)/generators/[slug=generator_slug]/generator-theme.ts`. ✅
  - Add `"steampunk": "Steampunk Hub"` to `HUB_LABELS` in `apps/web/src/routes/(marketing)/generators/[slug=generator_slug]/+page.svelte`. ✅
- **Task 3.3:** Add the "Steampunk Hub" card to the main index page `apps/web/src/routes/(marketing)/generators/+page.svelte` using `icon-[lucide--cog]`. ✅
- **Task 3.4:** Add `"Steampunk": "steampunk"` to `themeMap` in `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte` to ensure the CSS theme loads on generator pages. ✅
