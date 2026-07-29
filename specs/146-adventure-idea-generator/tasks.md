# Tasks: Adventure Idea Generator

**Branch**: `147-adventure-canvas-spatial` (encompasses `146-adventure-idea-generator`)
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Issue**: [#1879](https://github.com/eserlan/Codex-Cryptica/issues/1879)

## Phase 1: Core Generator Engine (`packages/generator-engine`)

- [x] **Task 1.1: Genre Types Interface & 15 Genre Tables**
  - Create `packages/generator-engine/src/adventure/genre-types.ts` with `AdventureGenreTables` interface.
  - Implement 15 genre table files in `packages/generator-engine/src/adventure/genres/` (Fantasy, Dark Fantasy, Sci-Fi, Cyberpunk, Post-Apoc, Gothic Horror, Western, Lancer, Steampunk, Vampire, Space Opera, Modern Conspiracy, Optimistic Sci-Fi, Pirate, etc.).

- [x] **Task 1.2: Pressure System, Name Bans & Loading Messages**
  - Added primary + secondary pressure source tables in `public-adventure-constants.ts`.
  - Added cliché name filtering (banning Vance, Vance Vance, Elara, Kaelen, Lyra, etc.) in `public-npc-constants.ts` and `public-adventure.ts`.
  - Added genre-specific loading messages with lingering timing in `packages/generator-engine/src/loading-messages.ts`.

- [x] **Task 1.3: Constants & Data Tables**
  - Create `packages/generator-engine/src/public-adventure-constants.ts` with `adventureConfig`, archetype/tone/scale tables, and genre-keyed exports.

- [x] **Task 1.4: Generator Types & Interfaces**
  - Update `packages/generator-engine/src/campaign-generator-types.ts`:
    - Add `"adventure"` to `SUPPORTED_GENERATOR_IDS`.

- [x] **Task 1.5: Generator Logic & Adapters with 10 GM Lore Preservation**
  - Create `packages/generator-engine/src/public-adventure.ts`:
    - Implement `generateAdventureLocal(options)`.
    - Implement `buildAdventurePrompt(options)`.
    - Implement `parseAdventureResponse(rawText, options)`.
    - Enforced `- **Title**: Description` bold header titles for list items and fixed double-dash formatting.
    - Export `adventureConfig`.

- [x] **Task 1.6: Generator Registration & Entity Mapping (`note` category)**
  - Update `packages/generator-engine/src/campaign-generator-registry.ts`:
    - Add `adventure: "note"` to `GENERATOR_ENTITY_TYPE`.
    - Import `adventureConfig` and add generator definition for `"adventure"`.
  - Update `packages/generator-engine/src/index.ts` to export all adventure generator functions, types, and configs.

- [x] **Task 1.7: Unit Test Suite**
  - Create `packages/generator-engine/src/public-adventure.test.ts`:
    - Test local generation across all 15 genres and options.
    - Test prompt builder formatting and instruction injection.
    - Test response parser handling of valid and fallback AI outputs.
    - Test registry resolution of `"adventure"` generator ID to `"note"` entity type.

## Phase 2: User Documentation & UI Integration (`apps/web`)

- [x] **Task 2.1: 3-Column Preview UI & Note Handoff**
  - Updated `SEOGeneratorLayout.svelte` and `generator-document-layout.ts` to render a 3-column preview card (Center column = Narrative Prose, Right column = DM Reference Rail).
  - Configured note saving and pending transfer to set `content` = player summary (`*${summary}*`) and `lore` = **ALL 10 GM Sections**.

- [x] **Task 2.2: Verification & Test Execution**
  - Verify `bun test packages/generator-engine` passes (398 tests passing).
  - Verify `npx vitest run apps/web/src/lib/components/canvas/use-canvas-logic.test.ts` passes (3 tests passing).
