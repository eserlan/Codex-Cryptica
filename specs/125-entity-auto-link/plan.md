# Implementation Plan: Entity Auto-Link in Content & Lore

**Branch**: `125-entity-auto-link` | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

## Summary

When a user reads an entity's content or lore, names of other vault entities (and their registered aliases) are automatically detected and rendered as clickable links using the active theme's link style. Clicking navigates to the target entity in a context-preserving way: sidebar mode opens the entity in the sidebar; zen/focus mode navigates within zen. No AI, no network — detection runs against the in-memory entity index.

Implementation extends the existing TipTap editor (already used for both read and edit mode in `MarkdownEditor.svelte`) with a custom ProseMirror decoration plugin that scans rendered text nodes and wraps entity name spans. The matching utility is extracted as a pure function for testability.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Svelte 5 (SvelteKit)  
**Primary Dependencies**: `@tiptap/core`, `prosemirror-view` (decorations), `tiptap-markdown`  
**Storage**: None — read-only display transformation over in-memory vault entity index  
**Testing**: Vitest + jsdom  
**Target Platform**: Browser (Chromium/Firefox/Safari); degrades gracefully to plain text when vault is unavailable  
**Project Type**: Web application feature (UI layer extension)  
**Performance Goals**: Detection + decoration render in < 100 ms for content up to 5 000 words on an average desktop device  
**Constraints**: No persistence, no AI, no network. Works in guest mode when entity index is available.  
**Scale/Scope**: Vaults up to ~1 000 entities; content up to ~10 000 words per entity

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                    | Status      | Notes                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **I — Library-First**        | ⚠️ Partial  | The entity-mention matching utility is a pure function testable in isolation. It lives in `apps/web/src/lib/utils/` rather than a dedicated package because it has no reuse scenario across packages — the only consumer is the TipTap extension. The TipTap extension itself is inherently UI-coupled. Documented in Complexity Tracking. |
| **II — TDD**                 | ✅ Required | Matching utility MUST have unit tests. Extension integration MUST have component-level tests.                                                                                                                                                                                                                                              |
| **III — YAGNI**              | ✅ Pass     | Simple longest-match substring scan. No trie, no Aho-Corasick unless profiling shows a need.                                                                                                                                                                                                                                               |
| **V — Privacy/Client-Side**  | ✅ Pass     | Entirely in-browser, no data leaves the device.                                                                                                                                                                                                                                                                                            |
| **VI — Style Guide**         | ✅ Required | Link styled via `text-theme-primary underline cursor-pointer` (same as existing TipTap Link extension).                                                                                                                                                                                                                                    |
| **VII — User Documentation** | ✅ Required | Help content entry needed in `help-content.ts`.                                                                                                                                                                                                                                                                                            |
| **VIII — DI**                | ✅ Required | Extension factory accepts entity index and navigation callback; does not import vault/layout stores directly.                                                                                                                                                                                                                              |
| **X — Coverage**             | ✅ Required | Matching utility ≥ 80%. Extension integration ≥ 50%.                                                                                                                                                                                                                                                                                       |
| **XI — Karpathy Rules**      | ✅ Pass     | Surgical changes to `MarkdownEditor.svelte` only. No unrelated refactors.                                                                                                                                                                                                                                                                  |

---

## Project Structure

### Documentation (this feature)

```text
specs/125-entity-auto-link/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code

```text
apps/web/src/lib/
├── utils/
│   ├── entity-mention-detector.ts        # NEW — pure matching utility
│   └── entity-mention-detector.test.ts   # NEW — unit tests (≥ 80% coverage)
├── components/
│   ├── editor/
│   │   ├── EntityAutoLinkExtension.ts    # NEW — TipTap decoration plugin
│   │   └── EntityAutoLinkExtension.test.ts  # NEW — integration tests
│   ├── entity-detail/
│   │   └── (no new files — MarkdownEditor props updated)
│   └── MarkdownEditor.svelte             # MODIFIED — accept optional entityIndex + onEntityClick props
└── config/
    └── help-content.ts                   # MODIFIED — add auto-link feature entry
```

---

## Complexity Tracking

| Item                                         | Why Needed                                                                      | Simpler Alternative Rejected Because                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Matching utility in `apps/web` not a package | No other package needs entity-mention detection; TipTap is not used in packages | Creating a package purely for a single-consumer utility adds workspace overhead with no benefit |

---

## Phase 0: Research

See [research.md](./research.md).

---

## Phase 1: Design & Contracts

See [data-model.md](./data-model.md) and [contracts/](./contracts/).

### Architecture decisions

#### A. Detection approach — longest-match sorted scan

Build a sorted array of `{ text: string, id: string }` entries (titles + aliases) from the entity index, sorted longest-first. For each text node in the ProseMirror document, scan left-to-right: at each position, try each pattern in order and take the first (longest) match that falls on a word boundary. This is O(T × E) where T = text length and E = entity count. For a 5 000-word document and 1 000 entities this is well within the 100 ms budget in practice; add a simple LRU cache keyed on `(contentHash, entityIndexVersion)` if profiling shows it's needed.

Word-boundary enforcement: a match is valid if the character immediately before the match start and immediately after the match end are either start/end-of-string, whitespace, or punctuation — not alphanumeric. This prevents "Aldric" matching inside "Aldric's" only when intentional.

#### B. TipTap integration — ProseMirror decoration plugin

The `EntityAutoLinkExtension` is a TipTap extension that registers a ProseMirror plugin. The plugin:

1. On each document state update, reads **`this.editor.isEditable`** from the TipTap editor instance available in the `addProseMirrorPlugins()` closure. When `true`, returns `DecorationSet.empty` without scanning. This is the correct mechanism — reading from `this.editor` (not a closure-captured option value) ensures the guard responds to runtime `editable` toggles without requiring option hot-swap.
2. Produces a `DecorationSet` of inline decorations — each a `Decoration.inline` with `{ class: "entity-auto-link text-theme-primary underline cursor-pointer", "data-entity-id": id }`.
3. Rebuilds decorations when `tr.getMeta('entityIndexChanged')` is set on a transaction (in addition to the normal `tr.docChanged` trigger). This handles vault mutations (entity renames, additions) that change the `entityIndex` prop but do not change the document content.

Click handling is attached via a single delegated event listener on the TipTap root element (not per-decoration) to avoid memory pressure on large documents.

**EntityIndex reactivity bridge**: `MarkdownEditor.svelte` adds a Svelte `$effect` that watches the `entityIndex` prop reference. When it changes, the effect dispatches a no-op ProseMirror transaction with meta key `entityIndexChanged: true`. The plugin's `apply` hook detects this meta key, sorts the updated index, and rebuilds the `DecorationSet`. This ensures live link refresh when vault entities are renamed or added while the view is open (spec edge case: "entity rename → links reflect current name").

#### C. Context-preserving navigation

The extension factory accepts a `onEntityClick: (entityId: string) => void` callback. The caller (`MarkdownEditor.svelte`) supplies the right implementation based on current layout context:

```
// in MarkdownEditor.svelte read-mode context:
const handleEntityClick = (id: string) => {
  if (layoutUIStore.mainViewMode === 'focus') {
    focusEntity(layoutUIStore, id);         // stay in zen, navigate within
  } else {
    vault.selectedEntityId = id;            // open in sidebar
  }
};
```

This keeps the extension free of store imports (Constitution VIII).

#### D. Self-link suppression

The factory also accepts the `currentEntityId: string` of the entity being viewed. Any match whose resolved `id === currentEntityId` is excluded from the decoration set.

#### E. Guest mode

`MarkdownEditor.svelte` already receives content as a prop. The entity index will be passed as a prop (`entityIndex` — an array of `{ id, text }[]`). The caller builds this from `vault.entities` (available to both host and guest). If the array is empty, the extension produces no decorations.
