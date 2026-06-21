# Project: Western Theme Hub and Generator Expansion

## Architecture

This feature spans multiple layers in Codex-Cryptica:

1. **Generator Engine Package (`packages/generator-engine`)**: Holds the framework-free generator vocabularies and prompt builders. Needs extensions for the Western theme/genre across NPC, Faction, and Quest generators.
2. **Schema Package (`packages/schema`)**: Defines themes and theme tokens (including custom jargon and styling templates). Needs the registration of the `western` and `western_dark` themes.
3. **Web Application (`apps/web`)**:
   - `ThemeStore` coordinates applying themes, including loading and saving vault settings.
   - `app.html` implements the bootstrap theme application to avoid layout flashes.
   - `app.css` defines muted/dim colors and styling for theme classes.
   - Routing and pages under `/generators/western` and generator slug handlers.
   - The `/generators` index page lists the Western Hub card.

## Milestones

| #   | Name                        | Scope                                                                                                                           | Dependencies | Status  |
| --- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------- |
| M1  | Generator Engine Expansions | Add Western vocabulary, roles, moralities, and tone mappings to `public-npc.ts`, `public-faction.ts`, `public-quest.ts`         | None         | PLANNED |
| M2  | Schema and CSS Theme Setup  | Register `western` and `western_dark` themes in `packages/schema/src/theme.ts`, `ThemeStore`, `app.html`, and `app.css`         | M1           | PLANNED |
| M3  | Hub Routing & Integration   | Setup parameter validation in `theme_hub.ts`, wire up genre resolution mapping, add the Western Hub card, and create test cases | M2           | PLANNED |
| M4  | Verification & E2E Testing  | Verify that all unit and E2E tests pass, and perform adversarial coverage hardening                                             | M3           | PLANNED |

## Interface Contracts

### Theme Slug mapping

- Svelte parameter: `western` -> Resolved theme ID: `western` (light) / `western_dark` (dark)
- Resolved Generator Genre: `"Western"` (for quests, social hubs, and nations) and `"Western / Frontier"` (for NPCs and factions)
- Jargon for Western theme:
  - `lore_header`: "Frontier Records"
  - `lore_secrets`: "Bounties & Hidden Truths"
  - `chronicle_header`: "Trail Log"
  - `search`: "Track"
  - `delete`: "Bury"
  - `graph_loading`: "Mapping the Trail..."
