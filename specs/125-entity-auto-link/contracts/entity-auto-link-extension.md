# Contract: EntityAutoLinkExtension

**Type**: TipTap extension (UI contract)  
**Consumer**: `MarkdownEditor.svelte`  
**Producer**: `apps/web/src/lib/components/editor/EntityAutoLinkExtension.ts`

---

## Factory Signature

```typescript
/**
 * Creates a configured TipTap extension that decorates entity name occurrences
 * in read-mode content with clickable inline spans.
 *
 * @param options - Configuration required to drive detection and navigation.
 * @returns A TipTap Extension instance ready for use in `useEditor()`.
 */
export function createEntityAutoLinkExtension(
  options: EntityAutoLinkOptions,
): Extension;
```

The function is a **pure factory** — it does not import stores, does not perform I/O, and does not retain state outside the returned ProseMirror plugin. It may be called multiple times with different options to produce independent extension instances.

---

## Options Contract

```typescript
interface EntityAutoLinkOptions {
  entityIndex: EntityIndexEntry[]; // see data-model.md
  currentEntityId: string; // suppresses self-links
  onEntityClick: (entityId: string) => void;
}
```

### Invariants

| Invariant                                                  | Enforcement                                                                |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| `entityIndex` may be empty (no crash, no decorations)      | Extension produces empty `DecorationSet` when array is empty               |
| `currentEntityId` may be an empty string (guest / unknown) | No match will equal `""` from a valid entity ID, so suppression is a no-op |
| `onEntityClick` must not throw synchronously               | Caller's responsibility; errors propagate to the delegated click listener  |

---

## Detection Utility Signature

```typescript
/**
 * Scans `text` for occurrences of entity names defined in `entityIndex`,
 * returning non-overlapping longest-first matches with self-link suppression.
 *
 * Pure function — no side effects.
 *
 * @param text            - The raw text string to scan.
 * @param entityIndex     - Pre-sorted (longest-first) array of index entries.
 * @param currentEntityId - Entity ID to exclude from results (self-link suppression).
 * @returns Sorted array of DetectedMatch (ascending start offset, non-overlapping).
 */
export function detectEntityMentions(
  text: string,
  entityIndex: EntityIndexEntry[],
  currentEntityId: string,
): DetectedMatch[];
```

**Caller contract**: `entityIndex` must be pre-sorted longest-first by `text.length` (descending). The factory sorts when initialized and re-sorts inside the `apply` hook when `tr.getMeta('entityIndexChanged')` is set. The utility trusts the order passed to it.

**EntityIndex reactivity**: When `entityIndex` changes in `MarkdownEditor.svelte`, the caller dispatches a no-op transaction with `tr.setMeta('entityIndexChanged', true)`. This bridges Svelte prop reactivity to the ProseMirror plugin lifecycle — the plugin does not respond to option reference changes on its own.

**Word-boundary rule**: A match at `[start, end)` is valid iff:

- `start === 0` OR `text[start - 1]` matches `/[^a-zA-Z0-9']/`
- `end === text.length` OR `text[end]` matches `/[^a-zA-Z0-9']/`

**Case sensitivity**: `text` is compared against lower-cased `EntityIndexEntry.text`. The matched span is taken from the original `text` string (casing preserved in `DetectedMatch.matchedText`).

---

## MarkdownEditor.svelte — New Props

```typescript
// ADDED props (all optional; feature degrades gracefully when absent)
entityIndex?: EntityIndexEntry[];    // default: []
currentEntityId?: string;            // default: ""
onEntityClick?: (id: string) => void; // default: no-op
```

**Backward compatibility**: Existing callers that do not pass these props continue to work — the extension produces an empty `DecorationSet` and no click handlers are registered.

---

## CSS Classes Applied to Decorations

| Class                | Source                  | Purpose                                              |
| -------------------- | ----------------------- | ---------------------------------------------------- |
| `entity-auto-link`   | New                     | Feature-scoped selector for tests / future overrides |
| `text-theme-primary` | Existing Tailwind token | Link colour matching active world theme              |
| `underline`          | Tailwind utility        | Underline to match markdown hyperlink style          |
| `cursor-pointer`     | Tailwind utility        | Pointer cursor on hover                              |

---

## Events

### Click

Delegated to the TipTap root DOM element. Fires when a `click` event bubbles up from an element with `data-entity-id`.

```
click on [data-entity-id="<id>"]
  → options.onEntityClick("<id>")
```

The listener is attached in the ProseMirror plugin's `view` lifecycle (`init`) and detached on `destroy`.

---

## Error / Degradation Behaviour

| Condition                    | Behaviour                                                                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `entityIndex` is empty       | Extension attaches, produces no decorations, no errors                                                                              |
| `editable = true`            | Extension attaches, produces no decorations — guarded by `this.editor.isEditable` check in `apply` hook (not a static option value) |
| Vault not yet loaded         | Caller passes `entityIndex: []` — same as empty case                                                                                |
| `onEntityClick` not provided | Prop defaults to no-op; clicks on decorations are silent                                                                            |
| Detection scan throws        | Extension catches, logs a warning, returns empty `DecorationSet`                                                                    |
