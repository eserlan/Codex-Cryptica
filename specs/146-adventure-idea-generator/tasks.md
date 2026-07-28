# Tasks: Adventure Idea Generator

**Branch**: `146-adventure-idea-generator`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Issue**: [#1879](https://github.com/eserlan/Codex-Cryptica/issues/1879)

## Phase 1: Core Generator Engine (`packages/generator-engine`)

- [ ] **Task 1.1: Genre Types Interface**
  - Create `packages/generator-engine/src/adventure/genre-types.ts` with `AdventureGenreTables` interface.

- [ ] **Task 1.2: Genre Content Files**
  - Create `packages/generator-engine/src/adventure/genres/` with one file per theme (fantasy, dark-fantasy, sci-fi, cyberpunk, post-apoc, gothic-horror).
  - Create `packages/generator-engine/src/adventure/index.ts` assembling `ADVENTURE_GENRE_TABLES` and `byGenre()` helper.

- [ ] **Task 1.3: Constants & Data Tables**
  - Create `packages/generator-engine/src/public-adventure-constants.ts` with `adventureConfig`, archetype/tone/scale tables, and genre-keyed exports.

- [ ] **Task 1.4: Generator Types & Interfaces**
  - Update `packages/generator-engine/src/campaign-generator-types.ts`:
    - Add `"adventure"` to `SUPPORTED_GENERATOR_IDS`.

- [ ] **Task 1.5: Generator Logic & Adapters**
  - Create `packages/generator-engine/src/public-adventure.ts`:
    - Implement `generateAdventureLocal(options)`.
    - Implement `buildAdventurePrompt(options)`.
    - Implement `parseAdventureResponse(rawText, options)`.
    - Export `adventureConfig`.

- [ ] **Task 1.6: Generator Registration & Exports**
  - Update `packages/generator-engine/src/campaign-generator-registry.ts`:
    - Add `adventure: "event"` to `GENERATOR_ENTITY_TYPE`.
    - Import `adventureConfig` and add generator definition for `"adventure"`.
  - Update `packages/generator-engine/src/index.ts` to export all adventure generator functions, types, and configs.

- [ ] **Task 1.7: Unit Test Suite**
  - Create `packages/generator-engine/src/public-adventure.test.ts`:
    - Test local generation across all genres and options.
    - Test prompt builder formatting and instruction injection.
    - Test response parser handling of valid and fallback AI outputs.
    - Test registry resolution of `"adventure"` generator ID to `"event"` entity type.

## Phase 2: User Documentation & UI Integration (`apps/web`)

- [ ] **Task 2.1: Help Content Update**
  - Update `apps/web/src/lib/config/help-content.ts` to document the Adventure Idea Generator.

- [ ] **Task 2.2: Verification & Test Execution**
  - Verify `bun test packages/generator-engine` passes.
