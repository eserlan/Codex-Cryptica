# Implementation Plan: Dungeon Idea Generator

**Branch**: `1825-dungeon-idea-generator` | **Date**: 2026-07-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/1825-dungeon-idea-generator/spec.md`

## Summary

Implement a **Dungeon Idea Generator** in `packages/generator-engine` and expose it across Codex Cryptica's generator interfaces (`apps/web` standalone generator session hub and campaign vault generator dialogs).

The feature consists of:

1. Generator engine core in `packages/generator-engine/src/public-dungeon.ts` (local tables, AI prompt builder, AI parser, types, and config).
2. Constant data tables in `packages/generator-engine/src/public-dungeon-constants.ts` (themes, original purposes, current statuses, hazards, scale parameters, architectural dressings, sector concepts, inhabitant types, secret boss mysteries, traps, relics, and hooks).
3. Registration in `campaign-generator-types.ts`, `campaign-generator-registry.ts`, and `index.ts`.
4. Adapter & converter logic to map dungeon output to `location` entities with follow-up suggestions (e.g. Generate Boss NPC, Inhabitant Factions, Relics).
5. Comprehensive unit testing across local generation, AI prompt formatting, AI parsing, and registry dispatch in `packages/generator-engine`.
6. Help content documentation update in `apps/web/src/lib/config/help-content.ts`.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 (Runes), Bun 1.3.14  
**Primary Dependencies**: `packages/generator-engine`, `@google/generative-ai` (via `aiClientManager`), `zod`  
**Storage**: OPFS (vault notes) & IndexedDB (via vault stores)  
**Testing**: Vitest (`bun run test`)  
**Target Platform**: Browser / Web Application (SvelteKit)  
**Project Type**: Workspace package (`packages/generator-engine`) + SvelteKit Web UI (`apps/web`)  
**Performance Goals**: < 10ms for local random dungeon generation  
**Constraints**: Zero client-side latency for offline generation; adherence to Svelte 5 Runes and Tailwind 4 semantic tokens in UI; strict TDD.

## Constitution Check

- **I. Library-First**: All generator logic, random tables, AI prompts, and response parsing live in `packages/generator-engine`. UI in `apps/web` is a thin client layer. (PASS)
- **II. TDD**: Tests will be written alongside code in `packages/generator-engine/src/public-dungeon.test.ts`. (PASS)
- **III. Simplicity & YAGNI**: Reuses existing generator patterns (`public-settlement.ts`, `public-social-hub.ts`, `public-quest.ts`). (PASS)
- **IV. AI-First Extraction**: Generates structured JSON / text output using existing `CampaignGeneratorService` & Gemini adapters. (PASS)
- **V. Privacy & Client-Side Processing**: Offline random tables run 100% in client JS without API calls when AI is not requested. (PASS)
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
specs/1825-dungeon-idea-generator/
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
    ├── public-dungeon-constants.ts   # Thematic tables for offline generation
    ├── public-dungeon.ts             # Generator logic, options, prompt builder, parser, local gen
    ├── public-dungeon.test.ts        # Comprehensive unit test suite
    ├── campaign-generator-types.ts   # Added "dungeon" to SUPPORTED_GENERATOR_IDS & types
    ├── campaign-generator-registry.ts# Added dungeon generator registration & entity mapping
    └── index.ts                      # Exported dungeon generator exports

apps/web/
└── src/
    └── lib/
        ├── config/
        │   └── help-content.ts       # Updated help guide to mention Dungeon Idea Generator
        └── components/
            └── ...                   # Session hub & generator dialogs dynamically consume registry
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | N/A        | N/A                                  |
