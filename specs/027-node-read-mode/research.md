# Research: Node Read Mode

**Feature**: Node Read Mode (027)
**Date**: 2026-01-31

## Technical Unknowns & Decisions

### 1. Markdown Rendering
- **Question**: How should we render the markdown content in the modal?
- **Options**:
    - Reuse `tiptap` (editor) in read-only mode.
    - Use `marked` + `DOMPurify` (as used in `SearchModal`).
    - Use a custom parser.
- **Decision**: Use **`marked` + `DOMPurify`**.
- **Rationale**: It's lightweight, already a dependency (used in `SearchModal`), and sufficient for a read-only view. `tiptap` is heavier and more complex to set up just for viewing.

### 2. Modal Architecture
- **Question**: How to manage the modal's visibility and state?
- **Options**:
    - Local state in `+layout.svelte` passed down via props/context.
    - A new global store (`ui.svelte.ts`).
    - Piggyback on `vault` store.
- **Decision**: Create a new **`ui.svelte.ts`** store.
- **Rationale**: There is currently no centralized UI state store. Separating UI state (like "which modal is open") from data state (`vault`) is good practice.

### 3. Data Access & Navigation
- **Question**: How to access node data and navigate relationships?
- **Decision**: Use **`vault.entities[id]`** for data and **`vault.inboundConnections`** for incoming links.
- **Rationale**: `vault.svelte.ts` is the single source of truth. Navigation will simply update the `readModeNodeId` in the `ui` store, which the modal will reactively reflect.

### 4. Copy Functionality
- **Question**: How to support rich text copy?
- **Decision**: Use the **Clipboard API** (`navigator.clipboard.write`) with `ClipboardItem`.
- **Rationale**: `writeText` only supports plain text. To preserve formatting (bold, links, etc.) for pasting into Word/Docs, we need to write HTML to the clipboard.

## Architecture

- **Store**: `apps/web/src/lib/stores/ui.svelte.ts`
- **Component**: `apps/web/src/lib/components/modals/NodeReadModal.svelte`
- **Trigger**: Button in `apps/web/src/lib/components/EntityDetailPanel.svelte`
