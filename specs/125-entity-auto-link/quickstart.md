# Developer Quickstart: Entity Auto-Link

**Branch**: `125-entity-auto-link` | **Date**: 2026-05-30

---

## What you're building

A TipTap decoration plugin that scans entity content/lore for vault entity names and renders them as clickable links — purely client-side, no AI, no network.

---

## Key files to create

| File                                                                 | Description                                  |
| -------------------------------------------------------------------- | -------------------------------------------- |
| `apps/web/src/lib/utils/entity-mention-detector.ts`                  | Pure matching utility (no TipTap dependency) |
| `apps/web/src/lib/utils/entity-mention-detector.test.ts`             | Unit tests (≥ 80% coverage required)         |
| `apps/web/src/lib/components/editor/EntityAutoLinkExtension.ts`      | TipTap extension + ProseMirror plugin        |
| `apps/web/src/lib/components/editor/EntityAutoLinkExtension.test.ts` | Integration tests (≥ 50% coverage required)  |

## Key files to modify

| File                                                | Change                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `apps/web/src/lib/components/MarkdownEditor.svelte` | Add `entityIndex`, `currentEntityId`, `onEntityClick` props; wire up extension |
| `apps/web/src/lib/config/help-content.ts`           | Add auto-link feature entry                                                    |

---

## Step 1 — Write the detector (start here, TDD)

```typescript
// apps/web/src/lib/utils/entity-mention-detector.ts

export interface EntityIndexEntry {
  text: string; // lowercase title or alias
  id: string; // canonical entity ID
}

export interface DetectedMatch {
  start: number;
  end: number;
  entityId: string;
  matchedText: string;
}

/**
 * Sort before passing to detectEntityMentions.
 */
export function sortEntityIndex(index: EntityIndexEntry[]): EntityIndexEntry[] {
  return [...index].sort((a, b) => b.text.length - a.text.length);
}

export function detectEntityMentions(
  text: string,
  sortedIndex: EntityIndexEntry[],
  currentEntityId: string,
): DetectedMatch[] {
  const lower = text.toLowerCase();
  const results: DetectedMatch[] = [];
  let pos = 0;

  while (pos < lower.length) {
    let matched = false;
    for (const entry of sortedIndex) {
      if (entry.id === currentEntityId) continue;
      const idx = lower.indexOf(entry.text, pos);
      if (idx !== pos) continue; // must start at current position
      if (!isWordBoundary(text, idx, idx + entry.text.length)) continue;

      results.push({
        start: idx,
        end: idx + entry.text.length,
        entityId: entry.id,
        matchedText: text.slice(idx, idx + entry.text.length),
      });
      pos = idx + entry.text.length;
      matched = true;
      break;
    }
    if (!matched) pos++;
  }

  return results;
}

function isWordBoundary(text: string, start: number, end: number): boolean {
  const before = start === 0 ? null : text[start - 1];
  const after = end >= text.length ? null : text[end];
  const wordChar = /[a-zA-Z0-9']/;
  return (
    (before === null || !wordChar.test(before)) &&
    (after === null || !wordChar.test(after))
  );
}
```

Write tests first. Reference cases:

- Basic match in a sentence
- Multiple matches in one text
- Case-insensitive match (original casing preserved)
- No match for substrings (`"sage"` alone when only `"Aldric the Sage"` exists)
- Possessives: `"Aldric's"` — `"Aldric"` should NOT match inside it
- Self-link suppression: same `currentEntityId` as match ID → excluded
- Overlapping candidates: longest wins

---

## Step 2 — Write the TipTap extension

```typescript
// apps/web/src/lib/components/editor/EntityAutoLinkExtension.ts
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  detectEntityMentions,
  sortEntityIndex,
} from "$lib/utils/entity-mention-detector";
import type { EntityIndexEntry } from "$lib/utils/entity-mention-detector";

const PLUGIN_KEY = new PluginKey("entityAutoLink");

const ENTITY_INDEX_CHANGED = "entityIndexChanged";

export function createEntityAutoLinkExtension(options: EntityAutoLinkOptions) {
  return Extension.create({
    name: "entityAutoLink",
    addProseMirrorPlugins() {
      // NOTE: `this.editor` is the TipTap editor instance, available in the
      // addProseMirrorPlugins closure. Read isEditable at apply-time (not once
      // at factory-creation time) so the guard correctly responds to runtime toggles.
      const editor = this.editor;

      // Sorted index is rebuilt when entityIndexChanged meta fires; kept in
      // a mutable local so the apply hook always sees the latest snapshot.
      let sorted = sortEntityIndex(options.entityIndex);

      return [
        new Plugin({
          key: PLUGIN_KEY,
          state: {
            init(_, state) {
              if (editor.isEditable) return DecorationSet.empty;
              return buildDecorations(state.doc, sorted, options);
            },
            apply(tr, old, _, newState) {
              // Editable guard — checked on every transaction so toggles are live.
              if (editor.isEditable) return DecorationSet.empty;

              // entityIndex prop changed: re-sort and rebuild.
              if (tr.getMeta(ENTITY_INDEX_CHANGED)) {
                sorted = sortEntityIndex(options.entityIndex);
                return buildDecorations(newState.doc, sorted, options);
              }

              // Normal document change.
              if (tr.docChanged)
                return buildDecorations(newState.doc, sorted, options);

              return old;
            },
          },
          props: {
            decorations(state) {
              return this.getState(state);
            },
          },
          view(editorView) {
            const listener = (e: MouseEvent) => {
              const target = (e.target as HTMLElement).closest(
                "[data-entity-id]",
              );
              if (target) {
                options.onEntityClick(
                  (target as HTMLElement).dataset.entityId!,
                );
              }
            };
            editorView.dom.addEventListener("click", listener);
            return {
              destroy() {
                editorView.dom.removeEventListener("click", listener);
              },
            };
          },
        }),
      ];
    },
  });
}

function buildDecorations(
  doc: any,
  sorted: EntityIndexEntry[],
  options: EntityAutoLinkOptions,
): DecorationSet {
  if (sorted.length === 0) return DecorationSet.empty;
  const decos: Decoration[] = [];
  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;
    const matches = detectEntityMentions(
      node.text!,
      sorted,
      options.currentEntityId,
    );
    for (const m of matches) {
      decos.push(
        Decoration.inline(pos + m.start, pos + m.end, {
          class: "entity-auto-link text-theme-primary underline cursor-pointer",
          "data-entity-id": m.entityId,
          role: "link",
          tabindex: "0",
        }),
      );
    }
  });
  return DecorationSet.create(doc, decos);
}
```

---

## Step 3 — Wire up MarkdownEditor.svelte

Add props (with defaults for backward compatibility):

```svelte
<script lang="ts">
  // ...existing props...
  let {
    entityIndex = [],
    currentEntityId = "",
    onEntityClick = () => {},
  } = $props();
</script>
```

Add the extension to the `useEditor` call (alongside existing extensions):

```typescript
createEntityAutoLinkExtension({ entityIndex, currentEntityId, onEntityClick }),
```

The editable guard is handled inside the plugin via `this.editor.isEditable` — no `editable` prop needs to be passed to the extension.

Add a Svelte `$effect` **after** the `useEditor` call to bridge entityIndex prop changes into the plugin:

```typescript
let editor = useEditor({ ... });

// Bridge: dispatch a no-op transaction when entityIndex changes so the plugin
// rebuilds decorations (e.g., after a vault entity is renamed).
$effect(() => {
  entityIndex; // reactive dependency — touch it to subscribe
  if (editor && !editor.isEditable) {
    editor.view.dispatch(
      editor.state.tr.setMeta('entityIndexChanged', true)
    );
  }
});
```

---

## Step 4 — Call site (entity detail view)

Find the component that renders entity content/lore and update it to pass the new props:

```svelte
<MarkdownEditor
  content={entity.content}
  {editable}
  entityIndex={$vault.entities.flatMap((e) => [
    { text: e.title.toLowerCase(), id: e.id },
    ...e.aliases.map((a) => ({ text: a.toLowerCase(), id: e.id })),
  ])}
  currentEntityId={entity.id}
  onEntityClick={(id) => {
    if (layoutUIStore.mainViewMode === "focus") {
      focusEntity(layoutUIStore, id);
    } else {
      vault.selectedEntityId = id;
    }
  }}
/>
```

---

## Running tests

```bash
# From repo root
bun run test --filter entity-mention-detector
bun run test --filter EntityAutoLinkExtension
```

Coverage report (requires ≥ 80% for detector, ≥ 50% for extension):

```bash
bun run test --coverage --filter entity-mention
```

---

## Checklist before opening PR

- [ ] `detectEntityMentions` unit tests pass with ≥ 80% coverage
- [ ] `EntityAutoLinkExtension` integration tests pass with ≥ 50% coverage
- [ ] No decorations appear in edit mode
- [ ] No decoration for self-referencing entity name
- [ ] Clicking a link navigates correctly (sidebar and zen mode)
- [ ] `help-content.ts` entry added
- [ ] No TypeScript errors (`bun run typecheck`)
- [ ] No lint errors (`bun run lint`)
