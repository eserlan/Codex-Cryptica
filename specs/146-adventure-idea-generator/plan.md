# Implementation Plan: Adventure Idea Generator

**Branch**: `146-adventure-idea-generator` | **Date**: 2026-07-28 | **Spec**: [spec.md](./spec.md)

## Summary

Implement an **Adventure Idea Generator** in `packages/generator-engine` and expose it across Codex Cryptica's generator interfaces, mirroring the dungeon generator pattern exactly.

The feature consists of:

1. Generator engine core in `packages/generator-engine/src/public-adventure.ts` (local tables, AI prompt builder, AI parser, types, and config).
2. Constant data tables in `packages/generator-engine/src/public-adventure-constants.ts` (adventure types, tones, scales, archetype-keyed situation seeds, NPC role seeds, threat types, complication seeds, outcome seeds).
3. Genre content in `packages/generator-engine/src/adventure/genres/` (one file per theme, matching dungeon genre file shape).
4. Registration in `campaign-generator-types.ts`, `campaign-generator-registry.ts`, and `index.ts`.
5. Adapter & converter logic to map adventure output to `event` entities with follow-up suggestions (e.g. Build Adventure, Generate NPC, Generate Location).
6. Comprehensive unit testing across local generation, AI prompt formatting, AI parsing, and registry dispatch in `packages/generator-engine`.
7. Help content documentation update in `apps/web/src/lib/config/help-content.ts`.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), Bun 1.3.14  
**Primary Dependencies**: `packages/generator-engine`, `@google/generative-ai` (via `aiClientManager`), `zod`  
**Storage**: OPFS (vault notes) & IndexedDB (via vault stores)  
**Testing**: Vitest (`bun run test`)  
**Target Platform**: Browser / Web Application (SvelteKit)  
**Project Type**: Workspace package (`packages/generator-engine`) + SvelteKit Web UI (`apps/web`)  
**Performance Goals**: < 10ms for local random adventure generation  
**Constraints**: Zero client-side latency for offline generation; adherence to Svelte 5 Runes and Tailwind 4 semantic tokens in UI; strict TDD.

## Constitution Check

- **I. Library-First**: All generator logic, random tables, AI prompts, and response parsing live in `packages/generator-engine`. UI in `apps/web` is a thin client layer. (PASS)
- **II. TDD**: Tests written alongside code in `packages/generator-engine/src/public-adventure.test.ts`. (PASS)
- **III. Simplicity & YAGNI**: Reuses existing generator patterns (`public-dungeon.ts`, `public-quest.ts`). (PASS)
- **IV. AI-First Extraction**: Generates structured JSON output using existing `CampaignGeneratorService` & Gemini adapters. (PASS)
- **V. Privacy & Client-Side Processing**: Offline random tables run 100% in client JS without API calls. (PASS)
- **VI. Clean Implementation**: Follows style guide, Svelte 5 runes, strict linting, zero unused vars. (PASS)
- **VII. User Documentation**: Updates `apps/web/src/lib/config/help-content.ts`. (PASS)
- **VIII. Dependency Injection**: Integrates via `campaignGeneratorService` / registry singleton with injectable deps. (PASS)
- **IX. Natural Language**: Clear, unpretentious RPG terminology. (PASS)
- **X. Quality & Coverage**: Full unit test coverage for new files in `packages/generator-engine`. (PASS)
- **XI. Agent Operational Protocol**: Surgical changes, clean verification with `bun run test`. (PASS)
- **XII. Terminology Unification**: Uses "Labels" for entity tags. (PASS)

## Project Structure

### Documentation (this feature)

```text
specs/146-adventure-idea-generator/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── checklists/
│   └── requirements.md  # Requirements checklist
└── tasks.md             # Implementation tasks
```

### Source Code

```text
packages/generator-engine/
└── src/
    ├── adventure/
    │   ├── genre-types.ts                # AdventureGenreTables interface
    │   ├── genres/
    │   │   ├── fantasy.ts
    │   │   ├── dark-fantasy.ts
    │   │   ├── sci-fi.ts
    │   │   ├── cyberpunk.ts
    │   │   ├── post-apoc.ts
    │   │   └── gothic-horror.ts
    │   └── index.ts                      # Assembles ADVENTURE_GENRE_TABLES, byGenre()
    ├── public-adventure-constants.ts     # Config, archetype seeds, shared tables
    ├── public-adventure.ts               # Generator logic, options, prompt builder, parser, local gen
    ├── public-adventure.test.ts          # Comprehensive unit test suite
    ├── campaign-generator-types.ts       # Added "adventure" to SUPPORTED_GENERATOR_IDS
    ├── campaign-generator-registry.ts    # Added adventure generator registration
    └── index.ts                          # Exported adventure generator exports

apps/web/
└── src/
    └── lib/
        └── config/
            └── help-content.ts           # Updated to mention Adventure Idea Generator
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | N/A        | N/A                                  |
