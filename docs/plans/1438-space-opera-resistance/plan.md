# Space Opera Resistance Theme Hub & Generator Expansion (Issue 1438)

## Overview

Add a Space Opera Resistance theme hub in Codex Cryptica, with generator genre support across all public generators.

This theme should support pulpy galactic rebellion, ancient orders, frontier planets, smugglers, imperial fleets, mystical warrior-monks, crime syndicates, desert worlds, occupied systems, and desperate heroic missions — without tying the content to any licensed setting.

## Phases and Tasks

### Phase 1: Generator Engine Expansion

Add "Space Opera Resistance" vocabulary pools to the public generator files using the existing `byGenre` pattern.

- **Task 1.1:** Update `packages/generator-engine/src/public-npc.ts` with species/ancestries, roles, moralities, names, affiliations.
- **Task 1.2:** Update `packages/generator-engine/src/public-faction.ts` with rebel cells, imperial authorities, syndicates, orders, guilds, fleets.
- **Task 1.3:** Update `packages/generator-engine/src/public-quest.ts` with missions, tones, threats, twists, locations, complications.
- **Task 1.4:** Update `packages/generator-engine/src/public-social-hub.ts` with cantinas, docking ports, black markets, rebel safehouses, frontier settlements.
- **Task 1.5:** Update `packages/generator-engine/src/public-nation.ts` (and any kingdom generator equivalents) with planetary governments, sector authorities, occupied worlds, federated systems.
- **Task 1.6:** Verify or add matching pools in the settlement generator for scale, environment, function, tone, tension, authority, names, locations, and factions.

### Phase 2: CSS Theme Definition

Implement the visual styling for the Space Opera Resistance theme.

- **Task 2.1:** Create `space-opera-resistance` and `space-opera-resistance_dark` theme entries in `packages/schema/src/theme.ts`.
- **Task 2.2:** Add CSS variables for the theme in `apps/web/src/app.css` (using deep space navy, warning red, sunlit gold, holographic cyan).

### Phase 3: Hub Setup & Routing

Wire the theme and generators together into the frontend.

- **Task 3.0:** Register `"space-opera-resistance"` as a valid hub route:
  - Add `"space-opera-resistance"` to `VALID_HUB_THEMES` in `apps/web/src/params/theme_hub.ts`.
  - Add `"space-opera-resistance"` to the `ThemeSlug` type union and the `entries()` array in `apps/web/src/routes/(marketing)/generators/[theme=theme_hub]/+page.ts`.
- **Task 3.1:** Create the new hub page configuration in `apps/web/src/routes/(marketing)/generators/[theme=theme_hub]/+page.svelte`.
- **Task 3.2:** Wire up Space Opera Resistance in the genre mappers:
  - Add `"space-opera-resistance": "Space Opera Resistance"` to `HUB_THEME_TO_GENERATOR_GENRE` in `apps/web/src/routes/(marketing)/generators/[slug=generator_slug]/generator-theme.ts`.
  - Add `"space-opera-resistance": "Space Opera Resistance Hub"` to `HUB_LABELS` in `apps/web/src/routes/(marketing)/generators/[slug=generator_slug]/+page.svelte`.
- **Task 3.3:** Add the "Space Opera Resistance Hub" card to the main index page `apps/web/src/routes/(marketing)/generators/+page.svelte` using an appropriate icon (e.g. `icon-[lucide--rocket]`).
- **Task 3.4:** Add `"Space Opera Resistance": "space-opera-resistance"` to `themeMap` in `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte`.
