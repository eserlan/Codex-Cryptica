# Implementation Plan: Connections Proposer

**Branch**: `040-connections-proposer` | **Date**: 2026-02-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification for background AI-driven connection suggestions.

## Summary

The Connections Proposer will automate relationship discovery within the Codex by performing background semantic analysis of entity content. It leverages the Lore Oracle (Gemini) to identify links that are not explicitly stated as WikiLinks, persists these proposals in IndexedDB, and provides a management UI for accepting, dismissing, or re-evaluating suggestions.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: Svelte 5 (Runes), `@google/generative-ai` (Gemini SDK), `idb` (IndexedDB)  
**Storage**: IndexedDB (New store `proposals`), OPFS (Reading entities)  
**Testing**: Vitest (Unit), Playwright (E2E)  
**Target Platform**: Browser (Modern Chrome/Firefox/Safari)  
**Project Type**: Web application (monorepo)  
**Performance Goals**: UI remains at 60fps during background scans; proposal generation < 5s per batch.  
**Constraints**: Must respect rate limits of Gemini API; must strictly cap rejection history at 20 items.

## Constitution Check

_GATE: Must pass before Phase 0 research._

| Principle                   | Status | Notes                                                                    |
| :-------------------------- | :----- | :----------------------------------------------------------------------- |
| **I. Library-First**        | PASS   | Core proposer logic will be implemented in `packages/proposer`.          |
| **II. TDD**                 | PASS   | Unit tests will verify suggestion filtering and persistence logic.       |
| **III. Simplicity & YAGNI** | PASS   | Reusing existing `oracle` and `vault` store interfaces.                  |
| **IV. AI-First**            | PASS   | Central to the semantic discovery goal.                                  |
| **V. Privacy**              | PASS   | Processing is local-first; AI calls are user-initiated/context-specific. |
| **VII. User Documentation** | PASS   | Help article and hint will be added to `help-content.ts`.                |

## Project Structure

### Documentation

```text
specs/040-connections-proposer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code

```text
packages/
├── proposer/
│   ├── src/
│   │   ├── index.ts          # Public API
│   │   ├── service.ts        # IProposerService implementation
│   │   ├── algorithm.ts      # Semantic matching logic
│   │   └── types.ts          # Shared proposal types

apps/web/src/
├── lib/
│   ├── config/
│   │   ├── help-content.ts       # Documentation entries
│   ├── stores/
│   │   ├── proposer.svelte.ts    # Coordinator for background scans
│   ├── components/
│   │   ├── entity-detail/
│   │   │   ├── DetailProposals.svelte # UI for viewing suggestions
```

**Structure Decision**: Core proposer logic will be implemented as a standalone package `packages/proposer`. The web application will consume this via the `ProposerStore` for state management and UI integration.
