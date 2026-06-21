# Original User Request

## Initial Request — 2026-06-19T14:06:53Z

Implement the Steampunk Theme Hub and Generator Expansion for Codex-Cryptica. This includes expanding the generator engine vocabulary pools, creating a new `steampunk` UI theme, and setting up the frontend routing for the hub.

Working directory: /home/espen/proj/Codex-Cryptica-v2
Integrity mode: development

## Requirements

### R1. Generator Engine Expansions

Add Steampunk vocabulary entries to the public generators (`public-npc.ts`, `public-faction.ts`, `public-quest.ts`, `public-social-hub.ts`, `public-nation.ts`) following the existing `byGenre` pattern.

### R2. Theme Setup

Implement a new `steampunk` and `steampunk_dark` theme in `apps/web/src/app.css` using appropriate CSS variables (e.g., brass/amber palettes, gear motifs). Register the theme in the relevant schema/store files (`packages/schema/src/theme.ts`).

### R3. Hub Setup & Routing

Add `"Steampunk": "steampunk"` to the mapping in `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte`, add a Hub card to the `/generators` index page (using a suitable icon like `icon-[game-icons--gears]`), and create the new route configuration for `/generators/steampunk`.

## Acceptance Criteria

### Functional

- [ ] Vocabulary pools for the Steampunk genre are fully populated across all specified public generators.
- [ ] The Steampunk hub page is accessible at `/generators/steampunk`.
- [ ] The `steampunk` theme applies correctly when visiting the hub and navigating to specific generators.

### Verification

- [ ] `bun run lint` passes without errors.
- [ ] `bun run test` passes without errors.
