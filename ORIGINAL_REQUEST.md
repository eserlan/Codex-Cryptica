# Original User Request

## Initial Request — 2026-06-19T13:12:45Z

Implement the Western Theme Hub and Generator Expansion for Codex-Cryptica. This includes expanding the generator engine vocabulary pools, creating a new `western` UI theme, and setting up the frontend routing for the hub.

Working directory: /home/espen/proj/Codex-Cryptica-v2
Integrity mode: development

## Requirements

### R1. Generator Engine Expansions

Add Western vocabulary entries to the public generators (`public-npc.ts`, `public-faction.ts`, `public-quest.ts`, `public-social-hub.ts`, `public-nation.ts`) following the existing `byGenre` pattern.

### R2. Theme Setup

Implement a new `western` and `western_dark` theme in `apps/web/src/app.css` using appropriate CSS variables (e.g., sepia/leather tones). Register the theme in the relevant schema/store files.

### R3. Hub Setup & Routing

Wire up the `western` theme mapping in `generator-theme.ts`, add a Hub card to the `/generators` index page, and create the new route for `/generators/western`.

## Acceptance Criteria

### Functional

- [ ] Vocabulary pools for the Western genre are fully populated across all specified public generators.
- [ ] The Western hub page is accessible at `/generators/western`.
- [ ] The `western` theme applies correctly when visiting the hub.

### Verification

- [ ] `bun run lint` passes without errors.
- [ ] `bun run test` passes without errors.

## Follow-up — 2026-06-19T14:06:53Z

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
