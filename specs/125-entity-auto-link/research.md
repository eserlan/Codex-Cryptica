# Research: Entity Auto-Link in Content & Lore

**Date**: 2026-05-30 | **Branch**: `125-entity-auto-link`

---

## Decision 1: Detection algorithm

**Decision**: Sorted longest-first linear scan with word-boundary enforcement.

**Rationale**: A sorted list (longest pattern first) guarantees the longest-match-wins rule in O(T × E) time. For the expected scale (≤ 10 000 chars, ≤ 1 000 entities) this is sub-millisecond. The implementation is a pure function with no external dependencies, easy to unit-test exhaustively.

**Alternatives considered**:

- **Aho-Corasick automaton** — O(T + E + matches), better asymptotic complexity, but requires a library or ~200 lines of custom code. Overkill at this scale; can be adopted later if profiling shows a need.
- **Regex alternation** — build a single `(title1|title2|…)` regex. Fast for small sets, but regex engine performance degrades for 500+ patterns and word-boundary handling becomes complex. Rejected.

---

## Decision 2: TipTap integration point

**Decision**: ProseMirror `DecorationSet` plugin registered via a custom TipTap extension.

**Rationale**: TipTap already ships a `Link` extension that uses decorations. Decorations are the idiomatic ProseMirror mechanism for non-destructive, read-only visual overlays that don't modify the document. They are automatically invalidated when the document changes and rebuilt on next state update. This approach:

- Leaves document content unmodified (no mark nodes in the schema)
- Requires zero serialisation changes (markdown ↔ TipTap round-trips are unaffected)
- Works correctly when `editable` toggles between true/false

**Alternatives considered**:

- **Custom Mark schema** — would persist in the document model, interfering with markdown serialisation. Rejected.
- **Post-render DOM walking** — fragile, bypasses ProseMirror's update cycle, breaks on virtual DOM re-renders. Rejected.
- **Separate read-mode renderer** (bypass TipTap entirely for read mode) — large change, diverges read/edit rendering paths. Rejected.

---

## Decision 3: Event handling for link clicks

**Decision**: Single delegated `click` listener on the editor DOM node, inspecting `data-entity-id` on the target.

**Rationale**: Attaching a listener per decoration would create up to thousands of handlers per document. A single delegated listener on the editor root is O(1) memory regardless of entity count, and is the same pattern used by most rich-text editors for inline interactives.

**Alternatives considered**:

- **Per-decoration NodeView** — overkill for a simple inline click; NodeViews are better suited for block-level interactives. Rejected.

---

## Decision 4: Word-boundary definition

**Decision**: A match is valid when the characters immediately before and after the matched span are non-alphanumeric (or string boundaries). Apostrophes and possessives ("Aldric's") are treated as word-continuations — "Aldric" does NOT match inside "Aldric's".

**Rationale**: Campaign writing frequently uses possessives and compound names. Matching "Aldric" inside "Aldric's" would produce a false positive on every possessive occurrence. The character set for "word continuation" is `[a-zA-Z0-9']`.

**Alternatives considered**:

- Unicode word-boundary regex (`\b`) — inconsistent across engines for non-ASCII entity names (e.g. names with diacritics). Custom boundary check is more predictable.

---

## Decision 5: Reactivity / cache strategy

**Decision**: Rebuild the decoration set on every document transaction when `editable = false`. Add a simple identity check: skip rebuild if neither the document content nor the entity index version has changed since the last build.

**Rationale**: TipTap fires state updates frequently (cursor moves, remote syncs). The detection scan must not run on every keystroke. Since the editor is not editable in read mode, the document content is effectively static — the only trigger for a rebuild is an entity index change (vault update). The identity check eliminates redundant work in the common case.
