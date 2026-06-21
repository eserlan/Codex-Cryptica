# Project: Steampunk Theme Hub and Generator Expansion

## Architecture

- **packages/generator-engine**: Vocabulary engine definitions. Contains the genre-specific arrays for NPCs, factions, quests, social hubs, and nations.
- **packages/schema**: Theme and data schemas. Houses the registration of the `steampunk` and `steampunk_dark` themes.
- **apps/web**: SvelteKit web application. Defines visual theme styling via Tailwind CSS classes and variables in `app.css`. Handles routing, pages, SEO layouts, and user interactions for the hub.

## Milestones

| #   | Name                         | Scope                                                                                                                | Dependencies | Status  |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------ | ------- |
| 1   | Generator Engine Expansion   | Update vocabulary pools in public-npc.ts, public-faction.ts, public-quest.ts, public-social-hub.ts, public-nation.ts | None         | PLANNED |
| 2   | CSS Theme Definition         | Add theme keys in theme.ts, add CSS variables in app.css                                                             | None         | PLANNED |
| 3   | Hub Setup & Routing          | Add SEO layout mapping, Hub card on generators page, configure steampunk generator hub routes                        | M1, M2       | PLANNED |
| 4   | E2E Testing and Verification | Add/update tests, verify via lint and tests, verify final theme application                                          | M3           | PLANNED |

## Interface Contracts

- **Theme Constants**: `theme.ts` exports `Theme` enum/types which must include `"steampunk"` and `"steampunk_dark"`.
- **Generator Genre Keys**: Generator files (`public-*.ts`) use `byGenre.steampunk` pattern for theme-specific vocabulary.
- **SEO Layout Theme Map**: `SEOGeneratorLayout.svelte` maps `"Steampunk": "steampunk"` to load the correct layout theme.

## Code Layout

- `packages/generator-engine/src/` -> public generator files
- `packages/schema/src/theme.ts` -> theme registry
- `apps/web/src/app.css` -> CSS variables and Tailwind setup
- `apps/web/src/lib/components/seo/SEOGeneratorLayout.svelte` -> SEO layout mappings
- `apps/web/src/routes/(marketing)/generators/` -> Generator index and hub pages
