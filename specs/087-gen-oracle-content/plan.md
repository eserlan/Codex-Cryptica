# Implementation Plan: Auto-generate Content from Oracle Chat

**Branch**: `087-gen-oracle-content` | **Date**: 2026-04-19 | **Spec**: [/workspaces/Codex-Cryptica/specs/087-gen-oracle-content/spec.md]
**Input**: Feature specification from `/specs/087-gen-oracle-content/spec.md`

## Summary

Implement a proactive entity discovery and drafting system that works "under-the-hood" during Oracle chat. The system will silently identify new and existing entities mentioned in conversation, prepare background drafts (Lore, Chronicle, Type), and present them as unobtrusive UI actions. It includes an optional "Auto-Archive" mode for zero-friction persistence of discovered lore, and seeds the existing connection proposer flow after Oracle-driven create/update so related connection suggestions appear without a separate scan.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (Svelte 5 Runes)  
**Primary Dependencies**: `@google/generative-ai` (Gemini SDK), `idb` (IndexedDB), `packages/oracle-engine`, `packages/vault-engine`  
**Storage**: OPFS (Primary Vault), IndexedDB (Registry & Draft Metadata), LocalStorage (Auto-Archive setting)  
**Testing**: Vitest (Unit/Integration), Playwright (E2E)  
**Target Platform**: Web (Modern Browsers supporting OPFS and Web Workers)  
**Project Type**: Web Application (Monorepo with SvelteKit frontend and TypeScript engine packages)  
**Performance Goals**: <500ms latency for proactive extraction; 85%+ accuracy in entity identification.  
**Constraints**: Must maintain offline functional parity (restricted mode); sensitive data must remain client-side.  
**Scale/Scope**: Real-time extraction on every Oracle assistant message; handles multiple entity discoveries per turn.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

1. **Library-First**: **PASS**. Extraction logic will be integrated into `packages/oracle-engine`.
2. **TDD**: **PASS**. Unit tests for `OracleGenerator` and `OracleParser` enhancements are required.
3. **Simplicity & YAGNI**: **PASS**. Extending existing `parseOracleResponse` and `ChatMessageActions` rather than building a new extraction pipeline.
4. **AI-First Extraction**: **PASS**. Leveraging Gemini's ability to follow structured instructions for entity identification.
5. **Privacy**: **PASS**. All processing and storage (OPFS) remain client-side.
6. **Clean Implementation**: **PASS**. Adhering to Svelte 5 Runes and TypeScript standards.
7. **User Documentation**: **PASS**. New guide entry for "Auto-Archive" and "Proactive Lore Discovery" to be added.
8. **Dependency Injection**: **PASS**. `OracleGenerator` and `OracleActionExecutor` already use DI.
9. **Natural Language**: **PASS**. UI actions use clear terms like "Add to Vault" and "Smart Update".
10. **Quality & Coverage Enforcement**: **PASS**. New tests must meet the 70% floor for engines.

## Project Structure

### Documentation (this feature)

```text
specs/087-gen-oracle-content/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API/UI contracts)
└── tasks.md             # Phase 2 output (generated via speckit.tasks)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── oracle/       # UI for discovery actions
│   │   ├── stores/           # UI state for auto-archive
│   │   └── services/         # Orchestration
│   └── routes/

packages/
├── oracle-engine/
│   └── src/                  # Proactive extraction logic
├── vault-engine/
│   └── src/                  # Draft status support
└── schema/
    └── src/                  # New DraftStatus types
```

**Structure Decision**: Integrated into existing `oracle-engine` and `vault-engine` packages to follow the "Library-First" constitution principle. UI components in `apps/web` will be updated to display the new discovery actions.

## Complexity Tracking

_No constitution violations identified._
