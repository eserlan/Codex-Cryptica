# Tasks: Dungeon Idea Generator

**Branch**: `1825-dungeon-idea-generator`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)  
**Issue**: [#1825](https://github.com/eserlan/Codex-Cryptica/issues/1825)

## Phase 1: Core Generator Engine (`packages/generator-engine`)

- [x] **Task 1.1: Constants & Data Tables**
  - Created `packages/generator-engine/src/public-dungeon-constants.ts` with thematic tables for genres (Fantasy, Dark Fantasy, Sci-Fi, Cyberpunk, Post-Apoc, Gothic Horror), purposes, statuses, hazards, scales, sector themes, inhabitants, boss mysteries, hazards, relics, and hooks.

- [x] **Task 1.2: Generator Types & Interfaces**
  - Updated `packages/generator-engine/src/campaign-generator-types.ts`:
    - Added `"dungeon"` to `SUPPORTED_GENERATOR_IDS`.
    - Defined `DungeonGeneratorOptions`, `DungeonPrompt`, and `DungeonOutput` types.

- [x] **Task 1.3: Generator Logic & Adapters**
  - Created `packages/generator-engine/src/public-dungeon.ts`:
    - Implemented `generateDungeonLocal(options)`.
    - Implemented `buildDungeonPrompt(options)`.
    - Implemented `parseDungeonResponse(rawText, options)`.
    - Exported `dungeonConfig`.

- [x] **Task 1.4: Generator Registration & Exports**
  - Updated `packages/generator-engine/src/campaign-generator-registry.ts`:
    - Added `dungeon: "location"` to `GENERATOR_ENTITY_TYPE`.
    - Imported `dungeonConfig` and added generator definition for `"dungeon"`.
  - Updated `packages/generator-engine/src/index.ts` to export all dungeon generator functions, types, and configs.

- [x] **Task 1.5: Unit Test Suite**
  - Created `packages/generator-engine/src/public-dungeon.test.ts`:
    - Tested local generation across all genres and options.
    - Tested prompt builder formatting and instruction injection.
    - Tested response parser handling of valid and fallback AI outputs.
    - Tested registry resolution of `"dungeon"` generator ID to `"location"` entity type.

## Phase 2: User Documentation & UI Integration (`apps/web`)

- [x] **Task 2.1: Help Content Update**
  - Updated `apps/web/src/lib/config/help-content.ts` to document the Dungeon Idea Generator in the generator suite guide.

- [x] **Task 2.2: Verification & Test Execution**
  - Verified `bun test packages/generator-engine` (237 passed, 0 failed).
