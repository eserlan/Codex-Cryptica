# Implementation Plan: Lite Version (No AI Support)

**Branch**: `054-lite-no-ai` | **Date**: 2026-02-21 | **Spec**: [/specs/054-lite-no-ai/spec.md](/specs/054-lite-no-ai/spec.md)
**Input**: Feature specification from `/specs/054-lite-no-ai/spec.md`

## Summary

Implement a global "Lite Mode" toggle that disables all AI-powered features (Oracle chat, image generation, tag suggestions) and ensures zero network traffic to AI endpoints. When enabled, the Oracle window operates in a **Restricted Mode**, supporting only deterministic utility commands (/connect, /merge, /help, /clear).

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+  
**Primary Dependencies**: Svelte 5, `@google/generative-ai`  
**Storage**: LocalStorage (for persistent setting `liteMode`)  
**Testing**: Playwright (E2E for UI removal and network silence), Vitest (for Restricted Oracle parser)

**Target Platform**: Browser (Web)
**Project Type**: Web application (SvelteKit)  
**Performance Goals**: UI entry points removed < 500ms after toggle  
**Constraints**: 100% offline-capable in Lite Mode, zero contact with Google Gemini API  
**Scale/Scope**: Impacts `uiStore`, `oracleStore`, and multiple UI components (Sidebar, OracleWindow, EntityDetail)

## Constitution Check

_GATE: Passed. Re-checked after Phase 1 design._

| Principle                | Result | Notes                                                                  |
| ------------------------ | ------ | ---------------------------------------------------------------------- |
| I. Library-First         | PASS   | Setting logic remains in UI store; Oracle logic stays in Oracle store. |
| II. TDD                  | PASS   | Will write tests for Lite Mode toggle and command execution.           |
| III. Simplicity & YAGNI  | PASS   | Avoiding complex feature flags; using a simple boolean toggle.         |
| IV. AI-First Extraction  | N/A    | This feature explicitly allows opting out of this principle.           |
| V. Privacy & Client-Side | PASS   | Lite Mode is the ultimate expression of this principle.                |
| VI. Clean Implementation | PASS   | Adhering to Svelte 5 and TypeScript conventions.                       |
| VII. User Documentation  | PASS   | Will add Lite Mode details to Help articles.                           |

## Project Structure

### Documentation (this feature)

```text
specs/054-lite-no-ai/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (None required for internal refactor)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── stores/
│   │   ├── ui.svelte.ts      # Main liteMode state and toggle logic
│   │   └── oracle.svelte.ts  # Logic for restricted command processing
│   ├── services/
│   │   └── ai.ts             # Conditional SDK initialization
│   └── components/
│       ├── oracle/           # Conditional rendering of AI elements
│       └── settings/         # Lite Mode toggle UI
└── tests/
    └── lite-mode.spec.ts     # E2E verification of network silence and UI removal
```

**Structure Decision**: Integrated into existing SvelteKit app structure under `apps/web`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | N/A        | N/A                                  |
