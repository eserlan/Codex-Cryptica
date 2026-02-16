# Implementation Plan: Lore Oracle Chat Commands

**Branch**: `044-oracle-chat-commands` | **Date**: 2026-02-16 | **Spec**: [specs/044-oracle-chat-commands/spec.md](./spec.md)
**Input**: Feature specification from `/specs/044-oracle-chat-commands/spec.md`

## Summary

Implement a discoverable command system for the Lore Oracle chat, including a slash command menu UI and an interactive `/connect oracle` wizard. The system will leverage the Lore Oracle (AI) to analyze the full content of two selected entities (Source and Target) to propose thematic connection types, facilitating rapid graph building. Supports natural language parsing for direct connection commands.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+  
**Primary Dependencies**: Svelte 5 (Runes), `@google/generative-ai` (Gemini SDK), `idb` (IndexedDB), `flexsearch` (Search Engine)  
**Storage**: OPFS (Vault Files), IndexedDB (Chat History, Search Index)  
**Testing**: Vitest (Unit), Playwright (E2E)  
**Target Platform**: Web (Static Adapter)
**Project Type**: Web Application (SvelteKit)  
**Performance Goals**: Slash menu latency < 200ms, Autocomplete < 300ms, AI Proposal < 5s  
**Constraints**: Must be fully keyboard navigable. AI proposals depend on API availability.  
**Scale/Scope**: Support for all entity types; 100% client-side execution (except AI inference).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Library-First**: Interactive components and command logic will be part of the `oracle` domain in `apps/web`.
- [x] **TDD**: Tests for AI connection proposals and command filtering.
- [x] **Simplicity**: Reuses `searchStore` for autocomplete instead of custom logic.
- [x] **AI-First**: Connections are proposed by Gemini based on semantic content.
- [x] **Privacy**: All processing remains local; only entity descriptions are sent for inference.
- [x] **Clean Implementation**: Svelte 5 runes used for wizard state.
- [x] **User Documentation**: Will add a guide for chat commands in `apps/web/src/lib/content/help/chat-commands.md`.

## Project Structure

### Documentation (this feature)

```text
specs/044-oracle-chat-commands/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/web/src/
├── lib/
│   ├── components/
│   │   ├── oracle/
│   │   │   ├── CommandMenu.svelte       # NEW: Floating slash menu
│   │   │   ├── ConnectionWizard.svelte  # NEW: Interactive wizard
│   │   │   └── OracleChat.svelte        # MOD: Integrate menu/wizard
│   │   └── ui/
│   │       └── Autocomplete.svelte      # NEW: Reusable input
│   ├── config/
│   │   └── chat-commands.ts             # NEW: Command registry
│   ├── stores/
│   │   └── oracle.svelte.ts             # MOD: Support wizards
│   └── services/
│       └── ai.ts                        # MOD: Bridge to proposer package

packages/proposer/src/
├── service.ts                           # MOD: Add parseConnectionIntent & generateConnectionProposal
└── types.ts                             # MOD: Add connection types
```

**Structure Decision**: Web application (SvelteKit).

## Phase 1: Implementation Phases

### Phase 1: Foundation & Menu (P1)

- [ ] Task: Create `chat-commands.ts` registry.
- [ ] Task: Implement `CommandMenu.svelte` with floating positioning.
- [ ] Task: Integrate `CommandMenu` into `OracleChat.svelte`.
- [ ] Task: Conductor - User Manual Verification 'Foundation & Menu' (Protocol in workflow.md)

### Phase 2: Connection Wizard (P1)

- [ ] Task: Implement `ConnectionWizard.svelte` UI with entity selection.
- [ ] Task: Add `generateConnectionProposal` to `AIService`.
- [ ] Task: Implement step-by-step wizard logic in `OracleStore`.
- [ ] Task: Conductor - User Manual Verification 'Connection Wizard' (Protocol in workflow.md)

### Phase 3: Polish & Documentation (P2)

- [ ] Task: Add keyboard navigation to all wizard steps.
- [ ] Task: Create `apps/web/src/lib/content/help/chat-commands.md` with documentation.
- [ ] Task: Add E2E tests for the full connection flow.
- [ ] Task: Conductor - User Manual Verification 'Polish & Documentation' (Protocol in workflow.md)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
