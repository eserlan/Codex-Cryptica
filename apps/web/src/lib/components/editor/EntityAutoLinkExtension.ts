import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  detectEntityMentions,
  sortEntityIndex,
  type EntityIndexEntry,
} from "$lib/utils/entity-mention-detector";

export type { EntityIndexEntry };

/** ProseMirror plugin key — exported so tests can inspect plugin state directly. */
export const ENTITY_AUTO_LINK_KEY = new PluginKey<DecorationSet>(
  "entityAutoLink",
);

/**
 * Meta key used by MarkdownEditor.svelte's $effect to signal that the entity
 * index has changed. The plugin re-sorts and rebuilds decorations on receipt.
 */
export const ENTITY_INDEX_CHANGED_META = "entityIndexChanged";

export interface EntityAutoLinkOptions {
  /**
   * Flat array of title/alias entries (lowercase text) from the active vault.
   * Mutated in-place by the MarkdownEditor.svelte $effect before dispatching
   * the ENTITY_INDEX_CHANGED_META transaction, so the apply hook always sees
   * the latest snapshot.
   */
  entityIndex: EntityIndexEntry[];

  /**
   * ID of the entity currently being rendered. Matches against this ID are
   * suppressed to prevent self-links. Updated in the $effect alongside entityIndex.
   */
  currentEntityId: string;

  /**
   * Navigation callback invoked when the user clicks a detected entity link.
   * The extension does not import any store — context-preserving routing is
   * the caller's responsibility (Constitution VIII).
   */
  onEntityClick: (entityId: string) => void;
}

/**
 * Creates a TipTap extension that decorates entity name occurrences in
 * read-mode content with clickable inline spans.
 *
 * The extension is DI-clean: it accepts all external dependencies via `options`
 * and does not import vault/layout stores directly.
 */
export function createEntityAutoLinkExtension(
  options: EntityAutoLinkOptions,
): Extension {
  return Extension.create({
    name: "entityAutoLink",

    addProseMirrorPlugins() {
      // `this.editor` is the TipTap Editor instance — captured in the closure so
      // `editor.isEditable` is read at render-time (not snapshot at creation).
      const editor = this.editor;

      // Mutable sorted index — re-sorted when ENTITY_INDEX_CHANGED_META fires.
      let sorted = sortEntityIndex(options.entityIndex);

      return [
        new Plugin({
          key: ENTITY_AUTO_LINK_KEY,

          // State cache: stores the computed DecorationSet for the current document.
          // The editable gate is applied in props.decorations() below, so the cache
          // always holds "what decorations would look like in read mode".
          state: {
            init(_config, state) {
              return buildDecorations(
                state.doc,
                sorted,
                options.currentEntityId,
              );
            },

            apply(tr, old, _prevState, newState) {
              // EntityIndex changed: re-sort using the updated options ref and rebuild.
              if (tr.getMeta(ENTITY_INDEX_CHANGED_META)) {
                sorted = sortEntityIndex(options.entityIndex);
                return buildDecorations(
                  newState.doc,
                  sorted,
                  options.currentEntityId,
                );
              }

              // Document content changed: rebuild with existing sorted index.
              if (tr.docChanged) {
                return buildDecorations(
                  newState.doc,
                  sorted,
                  options.currentEntityId,
                );
              }

              return old;
            },
          },

          props: {
            /**
             * Called on every view render — including after setEditable() which
             * does not dispatch a transaction. The editable gate here ensures
             * decorations disappear immediately when the editor switches to edit
             * mode, without needing an intermediate transaction.
             */
            decorations(state) {
              if (editor.isEditable) return DecorationSet.empty;
              return (
                ENTITY_AUTO_LINK_KEY.getState(state) ?? DecorationSet.empty
              );
            },
          },

          view(editorView) {
            // Single delegated click listener — O(1) memory regardless of
            // decoration count (plan.md Decision 3).
            function handleClick(e: MouseEvent) {
              // Mirror the decoration gate: ignore clicks while editable so
              // future features or external code that emit data-entity-id in
              // edit mode cannot accidentally trigger navigation.
              if (editor.isEditable) return;
              const target = (e.target as HTMLElement).closest<HTMLElement>(
                "[data-entity-id]",
              );
              if (target?.dataset.entityId) {
                options.onEntityClick(target.dataset.entityId);
              }
            }

            editorView.dom.addEventListener("click", handleClick);

            return {
              destroy() {
                editorView.dom.removeEventListener("click", handleClick);
              },
            };
          },
        }),
      ];
    },
  });
}

function buildDecorations(
  doc: PMNode,
  sorted: EntityIndexEntry[],
  currentEntityId: string,
): DecorationSet {
  if (sorted.length === 0) return DecorationSet.empty;

  const decos: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const matches = detectEntityMentions(node.text, sorted, currentEntityId);
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
