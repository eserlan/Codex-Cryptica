# Implementation Plan: AI-Generated World-Aware Random Tables

**Branch**: `159-ai-world-aware-tables` | **Date**: 2026-08-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/159-ai-world-aware-tables/spec.md` (Issue #2250)

## Summary

Expand the Random Source system (#2247) with opt-in, world-grounded AI table generation. The generator leverages `packages/search-orchestrator` to retrieve relevant entities from the user's active vault and `packages/generator-engine` to build grounded prompts that pin proper nouns and emit `{sub_table}` tokens matching existing tables. Generated rows land in an interactive review staging table where users can inspect, edit, toggle, or accept individual rows before creating a new table or appending to an existing table.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Bun 1.3.14  
**Primary Dependencies**: Svelte 5 Runes, SvelteKit 2, `@codex/generator-engine`, `@codex/search-orchestrator`, `random-source-engine`, `@google/generative-ai`  
**Storage**: OPFS (Vault Files) & IndexedDB (via existing vault and random source stores; zero new database stores or schema flags)  
**Testing**: Vitest (Unit & Integration tests)  
**Target Platform**: Modern Desktop/Mobile Web Browsers (Local-first)  
**Project Type**: Monorepo packages + SvelteKit web application  
**Performance Goals**: Generation returns and renders candidate preview within <5 seconds on standard network; entity search retrieval overhead <100ms  
**Constraints**: 100% offline-compatible manual authoring and rolling; zero schema alterations or AI-specific data models  
**Scale/Scope**: Table row generation up to 50 rows per batch; vault entity grounding up to top 15 most relevant entities

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Principle I: Library-First**: Core prompt building, LLM parsing, anti-determinism, and local fallback are implemented in `packages/generator-engine`. Search grounding is driven by `packages/search-orchestrator`.
2. **Principle II: Test-Driven Development (TDD)**: Unit tests for prompt building, parsing, entity recognition, and service orchestration will be added alongside implementation.
3. **Principle III: Simplicity & YAGNI**: Reuses existing `campaign-context.ts`, search indexes, and standard `TableEntry` data models without creating new abstractions.
4. **Principle V: Privacy & Client-Side Processing**: Local vault search happens entirely on-device; only the relevant 10-15 entity summaries and table names are included in the generation prompt.
5. **Principle VI: Clean Implementation**: Adheres to Svelte 5 Runes, Tailwind 4 semantic tokens, and Iconify utility classes (`class="icon-[lucide--name] h-4 w-4"`).
6. **Principle VIII: Dependency Injection**: `TableGenerationService` uses constructor-based DI with sensible defaults.

## Project Structure

### Documentation (this feature)

```text
specs/159-ai-world-aware-tables/
├── plan.md              # Implementation plan
├── research.md          # Technical research & decisions
├── data-model.md        # Data models & transient types
├── quickstart.md        # User quickstart guide
├── contracts/           # API and service contracts
│   └── table-generator-contract.ts
└── tasks.md             # (To be generated in /sdd-tasks)
```

### Source Code Layout

```text
packages/generator-engine/
├── src/
│   ├── public-random-table.ts        # Table prompt builder, parser, & local fallback
│   ├── public-random-table.test.ts   # Unit tests for prompt construction and parsing
│   ├── campaign-generator-registry.ts # Generator registration for random-table
│   └── index.ts                      # Public exports

apps/web/
├── src/
│   ├── lib/
│   │   ├── services/
│   │   │   ├── table-generation-service.ts       # Orchestration service (search + AI)
│   │   │   └── table-generation-service.test.ts  # Service unit tests
│   │   └── components/
│   │       └── random/
│   │           ├── TableGenerateDialog.svelte    # Generation setup modal
│   │           ├── TableStagingPreview.svelte    # Candidate row review & edit table
│   │           ├── TableEditor.svelte            # "Generate entries" trigger button
│   │           └── TableRoller.svelte            # Lore mention highlight in roll results
```

**Structure Decision**: Multi-package monorepo extension adding generator primitives to `packages/generator-engine` and UI/service orchestration to `apps/web`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | N/A        | N/A                                  |
