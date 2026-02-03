# Implementation Plan: Oracle Undo

**Branch**: `036-oracle-undo` | **Date**: 2026-02-03 | **Spec**: [specs/036-oracle-undo/spec.md]
**Input**: Feature specification from `/specs/036-oracle-undo/spec.md`

## Summary

Implement a command pattern with an undo stack within the `OracleStore`. Refactor `ChatMessage` to push undo actions to this stack when modifying vault data. Add global keyboard listeners (Ctrl+Z) in `OracleWindow` to trigger undo.

## Technical Context

**Language/Version**: TypeScript 5.x, Svelte 5
**Primary Dependencies**: `apps/web` (SvelteKit), `packages/schema`
**Storage**: In-memory stack for undo history (transient).
**Testing**: Playwright for E2E (user interactions), Unit tests for Store logic.
**Architecture**:
- `OracleStore` adds `undoStack` and `undo()` method.
- `ChatMessage` logic for `applySmart`, `copyTo*`, `createAsNode` updated to capture "before" state and push reversers to `oracle`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Local-First**: Undo history is local, in-memory.
- **No external deps**: Uses standard command pattern.
- **Performance**: State capture MUST use `structuredClone(entity)` to ensure a deep copy of the entity state is preserved, preventing reference mutation issues since `vault.entities` are plain objects.

## Project Structure

### Documentation (this feature)

```text
specs/036-oracle-undo/
├── plan.md
├── spec.md
└── tasks.md
```

### Source Code

```text
apps/web/src/lib/stores/
├── oracle.svelte.ts       # Add undo stack logic
└── vault.svelte.ts        # (Reference only)

apps/web/src/lib/components/oracle/
├── ChatMessage.svelte     # Instrument actions with undo tracking
└── OracleWindow.svelte    # Add keyboard listener
```

## Implementation Strategy

### MVP First (User Story 1 & 2)

1.  **Foundation**: Add `undoStack` to `OracleStore`.
2.  **Instrumentation**: Modify `ChatMessage` to push actions.
3.  **UI**: Add Keydown listener and Visual feedback.
