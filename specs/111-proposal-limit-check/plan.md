# Implementation Plan: Connection Proposal Limit Check

**Branch**: `111-proposal-limit-check` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/111-proposal-limit-check/spec.md`

## Summary

Implements a check to see if the active entity has more than 4 total connections (outbound + inbound). If this threshold is exceeded, disable the automatic background proposal trigger and show a manual "Look for Connection Proposals" button in the standard Detail sidebar and Zen mode. Also, keep all global/local proposal caches synchronized on mutations and vault switches.

## Technical Context

**Language/Version**: TypeScript 6.0.3, Svelte 5 Runes  
**Primary Dependencies**: Svelte 5, IndexedDB, Flexsearch  
**Storage**: IndexedDB (`proposals` store via ProposerService)  
**Testing**: Vitest  
**Target Platform**: Browser  
**Project Type**: Web Application  
**Performance Goals**: Instant count check (<10ms)  
**Constraints**: Keep global proposals synchronized on all mutations

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Library-First**: Logic encapsulated in `ProposerService` and `proposerStore`.
- [x] **TDD**: Unit tests for both store mutations/events and component UI rendering.
- [x] **Simplicity**: Utilize Svelte 5 runes reactivity for automatic suppression.
- [x] **AI-First**: Prevent redundant/costly AI runs using threshold checks.
- [x] **Privacy**: Local IndexedDB database state.
- [x] **DI**: Injected proposerStore instance used in Svelte components.

## Project Structure

### Documentation (this feature)

```text
specs/111-proposal-limit-check/
├── spec.md              # Feature specification
├── plan.md              # This file
├── checklists/
│   └── requirements.md  # Quality checklists
└── tasks.md             # Task checklist (Phase 2 output)
```

### Source Code (repository root)

```text
apps/web/src/lib/
├── components/
│   └── entity-detail/
│       └── proposals/
│           ├── DetailProposals.svelte       # Component with bypass & manual button
│           └── DetailProposals.test.ts      # New component unit tests
└── stores/
    ├── proposer.svelte.ts                   # Store with event listeners & sync mutations
    └── proposer.svelte.test.ts              # Unit tests for store mutations
```

**Structure Decision**: Code changes are surgical and contained within the existing `DetailProposals.svelte` component and the `ProposerStore` service wrapper.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| N/A       |            |                                      |
