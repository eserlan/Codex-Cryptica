# Implementation Plan: Western Theme Hub and Generator Expansion

This plan outlines the specific files to modify and implementation steps for each milestone.

## Milestone 1: Generator Engine Expansions

1. **`packages/generator-engine/src/public-npc.ts`**:
   - Add `"Western / Frontier"` to `npcThemeConfig.ancestries` with Western-specific races.
   - Add `"Western / Frontier"` to `npcThemeConfig.roles` with roles like Gunslinger, Sheriff, Bounty Hunter, etc.
   - Add `"Western / Frontier"` to `npcThemeConfig.moralities` with 6 unique thematic moral alignments.
   - Add `"Western / Frontier"` to `NPC_THEME_VOICE` with description.
2. **`packages/generator-engine/src/public-faction.ts`**:
   - Add `western: "Western / Frontier"` and `western_dark: "Western / Frontier"` to `themeIdToLabel`.
   - Add `"Western / Frontier"` to `factionConfig.themes`.
   - Add `"Western / Frontier"` to `FACTION_THEME_VOICE` map.
3. **`packages/generator-engine/src/public-quest.ts`**:
   - Add `"Western / Frontier": "Western"` to `themeToQuestGenre`.
   - Add `"Western / Frontier"` to `questConfig.tonesByTheme`, `questConfig.scopesByTheme`, `questConfig.locationTypesByTheme`, and `questConfig.rewardsByTheme`.
4. **Unit Tests**:
   - Add tests or verify existing tests in `public-npc.test.ts`, `public-faction.test.ts`, and `public-quest.test.ts` to ensure Western theme returns appropriate vocabulary.

## Milestone 2: Schema and CSS Theme Setup

1. **`packages/schema/src/theme.ts`**:
   - Define `western` inside `THEMES` dictionary.
   - Define `WESTERN_DARK` styling template constant.
   - Export `WESTERN_DARK` and make sure `WorldThemeId` includes it.
2. **`apps/web/src/lib/stores/theme.svelte.ts`**:
   - Import `WESTERN_DARK` from `schema`.
   - Update `activeTheme` Svelte derived state to return `WESTERN_DARK` if `isDark` is true and theme ID is `western`.
3. **`apps/web/src/app.html`**:
   - Add `"western"` to `baseThemes` array.
   - Map `storedTheme === "western"` to `western_dark` when `isDark` is true.
   - Register `western` and `western_dark` colors in the inline `themes` stylesheet variables map.
4. **`apps/web/src/app.css`**:
   - Add muted/dim variables for `[data-theme="western_dark"]`.
   - Add `[data-theme="western_dark"]` selector to the frontpage vignette list.

## Milestone 3: Hub Routing & Integration

1. **`apps/web/src/params/theme_hub.ts`**:
   - Add `"western"` to `VALID_HUB_THEMES` set.
2. **`apps/web/src/routes/(marketing)/generators/[theme=theme_hub]/+page.ts`**:
   - Add `"western"` to `ThemeSlug` union.
   - Add `{ theme: "western" }` to entries list for SvelteKit prerendering.
3. **`apps/web/src/routes/(marketing)/generators/[slug=generator_slug]/generator-theme.ts`**:
   - Add `western: "Western"` to `HUB_THEME_TO_GENERATOR_GENRE` map.
4. **`apps/web/src/routes/(marketing)/generators/+page.svelte`**:
   - Add a new card in `themeHubs` for the Western Hub.
5. **E2E and Route Unit Tests**:
   - Update `theme-hubs.test.ts` to include `"western"`.
   - Update `generator-theme-hubs.spec.ts` to include `"western"` and verify the count of cards.

## Milestone 4: Verification and Hardening

1. Run all unit tests via `bun run test`.
2. Run Playwright E2E tests via `bun run test:e2e` or similar command.
3. Verify styling, page load, and theme application via the tests.
