# Data Model: Entity Auto-Link in Content & Lore

**Branch**: `125-entity-auto-link` | **Date**: 2026-05-30 | **Plan**: [plan.md](./plan.md)

---

## Entities

### EntityIndexEntry

A flattened entry in the entity index used for name-matching. Both the canonical title and each alias are represented as separate entries pointing to the same entity ID. This normalisation allows the detector to work against a flat `EntityIndexEntry[]` without branching on "is this an alias or a title".

```typescript
interface EntityIndexEntry {
  /** The text to match against (title or alias, lowercased for case-insensitive comparison). */
  text: string;
  /** The canonical entity ID this entry resolves to. */
  id: string;
}
```

**Derivation**: The caller (e.g. `MarkdownEditor.svelte`) builds this array from the vault's in-memory entity list:

```typescript
const entityIndex: EntityIndexEntry[] = vault.entities.flatMap((e) => [
  { text: e.title.toLowerCase(), id: e.id },
  ...e.aliases.map((a) => ({ text: a.toLowerCase(), id: e.id })),
]);
```

**Validation rules**:

- `text` must be non-empty (empty aliases from the vault schema are already filtered by the `min(1)` constraint on `aliases[]`)
- Duplicate `text` values are resolved by index order — first match wins (callers should order by entity creation date to ensure deterministic tie-breaking)

---

### DetectedMatch

The result of running the entity-mention detector over a text string. Represents a single successful match.

```typescript
interface DetectedMatch {
  /** Byte offset of the first matched character in the source string. */
  start: number;
  /** Byte offset one past the last matched character. */
  end: number;
  /** The canonical entity ID resolved from the match. */
  entityId: string;
  /** The matched text as it appears in the source (original casing preserved). */
  matchedText: string;
}
```

**Invariants**:

- `start < end`
- Matches are non-overlapping (the detector skips past each match after recording it)
- Matches are sorted by ascending `start` offset
- A match whose `entityId === currentEntityId` is excluded before returning (self-link suppression is applied by the detector, not the caller)

---

### EntityAutoLinkOptions

The configuration object passed to the `EntityAutoLinkExtension` factory. All fields are required; the caller must supply them.

```typescript
interface EntityAutoLinkOptions {
  /**
   * Flat array of index entries (titles + aliases) derived from the active vault.
   * Changes to this reference are bridged to the plugin via a no-op ProseMirror transaction
   * (meta key: `entityIndexChanged: true`) dispatched from a Svelte `$effect` in
   * `MarkdownEditor.svelte`. The plugin's `apply` hook detects this meta key and rebuilds
   * the `DecorationSet` with the updated index. ProseMirror plugins do not respond to
   * option reference changes on their own — the `$effect` bridge is required.
   */
  entityIndex: EntityIndexEntry[];

  /**
   * The ID of the entity currently being rendered. Matches against this ID are suppressed
   * (self-link prevention).
   */
  currentEntityId: string;

  /**
   * Navigation callback invoked when the user clicks a detected entity link.
   * The extension does not import any store; context-preserving routing is the caller's
   * responsibility.
   */
  onEntityClick: (entityId: string) => void;
}
```

---

### DecorationAttributes

The HTML attributes applied to each inline `Decoration.inline` created by the extension. Not a named type in the codebase — documented here for reference.

| Attribute        | Value                                                            | Purpose                                                                   |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `class`          | `"entity-auto-link text-theme-primary underline cursor-pointer"` | Visual styling via theme tokens                                           |
| `data-entity-id` | `<entityId>`                                                     | Used by the delegated click listener to resolve the target entity         |
| `role`           | `"link"`                                                         | Accessibility — announces the span as a navigation link to screen readers |
| `tabindex`       | `"0"`                                                            | Makes the span keyboard-focusable                                         |

---

## State Transitions

The extension's decoration state is governed by two inputs: the document content and the entity index. Neither is mutated by the extension — it is a pure read-side transform.

```
[this.editor.isEditable = true]  ────────────────────────────► empty DecorationSet
                                                               (no scan, no decorations)

[this.editor.isEditable = false]
  ├─► tr.docChanged = false AND tr.getMeta('entityIndexChanged') = false
  │     ────────────────────────────────────────────────────────► reuse old DecorationSet
  ├─► tr.docChanged = true ──────────────────────────────────── ► scan → new DecorationSet
  └─► tr.getMeta('entityIndexChanged') = true ─── re-sort + scan → new DecorationSet
```

**Editability check**: The plugin reads `this.editor.isEditable` (available as a TipTap extension closure reference) inside `addProseMirrorPlugins()`. This correctly reflects runtime toggles — it is not a snapshot captured at factory-creation time.

**EntityIndex change mechanism**: `MarkdownEditor.svelte` uses a Svelte `$effect` to watch the `entityIndex` prop. On change, it dispatches `editor.view.dispatch(editor.state.tr.setMeta('entityIndexChanged', true))`. The plugin's `apply` hook checks for this meta key, re-sorts the updated index from the extension closure, and rebuilds the `DecorationSet`.

---

## Relationships

```
MarkdownEditor.svelte
  │  props: entityIndex, currentEntityId, onEntityClick, editable
  │
  └── EntityAutoLinkExtension (TipTap extension)
        │  options: EntityAutoLinkOptions
        │
        ├── detectEntityMentions(text, entityIndex, currentEntityId)
        │     │  returns: DetectedMatch[]
        │     └── EntityIndexEntry[] (sorted longest-first, built once per entityIndex reference)
        │
        └── ProseMirror Plugin
              │  produces: DecorationSet (Decoration.inline per DetectedMatch)
              └── delegated click listener → onEntityClick(entityId)
```
