<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Editor } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import { Markdown } from "tiptap-markdown";
  import Link from "@tiptap/extension-link";
  import { BubbleMenu } from "@tiptap/extension-bubble-menu";

  import { Table } from "@tiptap/extension-table";
  import { TableRow } from "@tiptap/extension-table-row";
  import { TableCell } from "@tiptap/extension-table-cell";
  import { TableHeader } from "@tiptap/extension-table-header";
  import { EmbedExtension } from "./editor/EmbedExtension";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import {
    createEntityAutoLinkExtension,
    ENTITY_INDEX_CHANGED_META,
    type EntityAutoLinkOptions,
  } from "./editor/EntityAutoLinkExtension";
  import type { EntityIndexEntry } from "$lib/utils/entity-mention-detector";

  import EditorToolbar from "./editor/EditorToolbar.svelte";
  import EditorBubbleMenu from "./editor/EditorBubbleMenu.svelte";

  import { mount, unmount } from "svelte";

  let {
    content = "",
    editable = true,
    onUpdate,
    entityIndex = [],
    currentEntityId = "",
    onEntityClick = () => {},
  }: {
    content: string;
    editable?: boolean;
    onUpdate?: (markdown: string) => void;
    /** Flat array of vault entity titles + aliases (lowercase) for auto-link detection. */
    entityIndex?: EntityIndexEntry[];
    /** ID of the entity being viewed — suppresses self-links. */
    currentEntityId?: string;
    /** Navigation callback invoked when a detected entity link is clicked. */
    onEntityClick?: (id: string) => void;
  } = $props();

  // Options object shared with the EntityAutoLinkExtension closure.
  // Getters are used so the plugin reads current prop values at call-time
  // rather than capturing initial values (avoids Svelte state_referenced_locally
  // warning and keeps the object in sync without mutation).
  const autoLinkOptions: EntityAutoLinkOptions = {
    get entityIndex() {
      return entityIndex;
    },
    get currentEntityId() {
      return currentEntityId;
    },
    get onEntityClick() {
      return onEntityClick;
    },
  };

  let element: HTMLDivElement;
  let editor = $state<Editor | null>(null);
  let bubbleMenuComponent: ReturnType<typeof mount> | undefined;
  let isZenMode = $state(false);

  const toggleZenMode = () => {
    isZenMode = !isZenMode;
  };

  onMount(() => {
    const menuDom = document.createElement("div");

    editor = new Editor({
      element: element,
      extensions: [
        StarterKit.configure({
          // Disable link in StarterKit to avoid duplication warning
          link: false,
        } as any),
        Markdown.configure({
          html: true,
          transformPastedText: false,
          transformCopiedText: true,
        }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        EmbedExtension,
        createEntityAutoLinkExtension(autoLinkOptions),
        Link.configure({
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            class: "text-theme-primary underline cursor-pointer",
          },
        }) as any,
        BubbleMenu.configure({
          element: menuDom,
          pluginKey: "bubbleMenu",
        }),
      ],
      editorProps: {
        attributes: {
          class:
            "prose max-w-none focus:outline-none min-h-[100px] font-body text-lg leading-relaxed text-theme-text",
        },
      },
      content: content,
      editable: editable,
      onUpdate: ({ editor }) => {
        const markdown = (editor.storage as any).markdown.getMarkdown();
        if (onUpdate) onUpdate(markdown);
      },
    });

    try {
      bubbleMenuComponent = mount(EditorBubbleMenu, {
        target: menuDom,
        props: { editor },
      });
    } catch (e) {
      console.error("Failed to mount Bubble Menu", e);
    }
  });

  export function insertEmbed(src: string) {
    editor?.commands.insertContent({
      type: "embedWidget",
      attrs: { src },
    });
  }

  $effect(() => {
    if (
      editor &&
      content !== undefined &&
      (editor.storage as any).markdown.getMarkdown() !== content
    ) {
      editor.commands.setContent(content);
    }
  });

  $effect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  });

  // Entity auto-link reactivity bridge: when entityIndex, currentEntityId, or
  // onEntityClick props change, dispatch a no-op transaction so the plugin's
  // apply hook re-sorts options.entityIndex and rebuilds decorations.
  // The options object uses getters so it always reads current prop values;
  // these reads declare reactive dependencies that fire this $effect on change.
  $effect(() => {
    // Declare reactive dependencies (getters read current prop values at call-time).
    void entityIndex;
    void currentEntityId;
    void onEntityClick;
    // Always dispatch when deps change so the cached DecorationSet stays current
    // even when entityIndex updates while the editor is in edit mode.
    // The editable gate lives in props.decorations() — not here — so dispatching
    // in edit mode is harmless: the plugin simply returns DecorationSet.empty.
    if (editor) {
      editor.view.dispatch(
        editor.state.tr.setMeta(ENTITY_INDEX_CHANGED_META, true),
      );
    }
  });

  onDestroy(() => {
    if (bubbleMenuComponent) {
      try {
        unmount(bubbleMenuComponent);
      } catch (e) {
        console.warn("Failed to unmount bubble menu", {
          error: e,
          component: bubbleMenuComponent,
        });
      }
    }
    if (editor) {
      editor.destroy();
    }
  });
</script>

<div
  class="markdown-editor-container flex flex-col relative w-full h-full"
  class:zen-mode={isZenMode}
>
  <!-- Fixed Toolbar at the top -->
  {#if editable && editor}
    <EditorToolbar {editor} {isZenMode} onToggleZenMode={toggleZenMode} />
  {/if}

  <div
    bind:this={element}
    class="tiptap-editor-wrapper flex-1"
    class:readonly={!editable}
    onclick={(e) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        const rect = img.getBoundingClientRect();
        modalUIStore.openLightbox(img.src, img.alt || "Image", {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }}
    onkeydown={(e) => {
      if (e.key === "Enter") {
        const target = e.target as HTMLElement;
        if (target && target.tagName === "IMG") {
          const img = target as HTMLImageElement;
          const rect = img.getBoundingClientRect();
          modalUIStore.openLightbox(img.src, img.alt || "Image", {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          });
        }
      }
    }}
    role="presentation"
  ></div>
</div>

<style>
  .markdown-editor-container {
    /* Default state */
    transition: all 0.2s ease-in-out;
  }

  /* Zen Mode State - applied via class toggle in EditorToolbar logic */
  :global(.markdown-editor-container.zen-mode) {
    position: fixed;
    top: var(--header-height, 65px); /* Below main app header */
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 150; /* High enough to be above aside and modals if needed */
    background-color: var(--color-theme-bg);
    padding: 0; /* Remove padding to allow toolbar to be flush top */
  }

  :global(.markdown-editor-container.zen-mode .tiptap-editor-wrapper) {
    max-width: 800px;
    margin: 2rem auto; /* Add margin here instead */
    height: calc(100% - 4rem);
    border: none;
    background: transparent;
  }

  .tiptap-editor-wrapper {
    min-height: 200px;
    background: var(--color-theme-bg);
    color: var(--color-theme-text);
    border: 1px solid var(--color-theme-border);
    border-radius: 4px;
    padding: 1rem;
    overflow-y: auto;
  }

  .tiptap-editor-wrapper.readonly {
    border-color: transparent;
    background: transparent;
    padding: 0;
  }

  :global(.ProseMirror) {
    outline: none;
    height: 100%;
  }

  :global(.ProseMirror img) {
    cursor: zoom-in;
    transition: transform 0.2s ease-in-out;
  }

  :global(.ProseMirror img:hover) {
    transform: scale(1.02);
  }

  :global(.ProseMirror > :first-child) {
    margin-top: 0 !important;
  }

  :global(.ProseMirror table) {
    border-collapse: collapse;
    margin: 1rem 0;
    overflow: hidden;
    width: 100%;
  }

  :global(.ProseMirror td),
  :global(.ProseMirror th) {
    min-width: 1em;
    border: 1px solid var(--color-theme-border);
    padding: 8px 12px;
    vertical-align: top;
    box-sizing: border-box;
    position: relative;
  }

  :global(.ProseMirror th) {
    font-weight: 700;
    text-align: left;
    background-color: color-mix(
      in srgb,
      var(--color-theme-primary),
      transparent 80%
    );
    color: var(--color-theme-primary);
    border-color: var(--color-theme-border);
  }

  :global(.ProseMirror h1),
  :global(.ProseMirror h2),
  :global(.ProseMirror h3) {
    color: var(--color-theme-primary);
    font-weight: 700;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }

  :global(.ProseMirror h1) {
    font-size: 1.5em;
  }
  :global(.ProseMirror h2) {
    font-size: 1.25em;
  }
  :global(.ProseMirror h3) {
    font-size: 1.1em;
  }

  :global(.ProseMirror ul) {
    list-style-type: disc;
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }

  :global(.ProseMirror ol) {
    list-style-type: decimal;
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }

  :global(.ProseMirror li) {
    margin-bottom: 0.25rem;
  }

  :global(.ProseMirror blockquote) {
    border-left: 3px solid var(--color-theme-primary);
    padding-left: 1rem;
    margin-left: 0;
    margin-right: 0;
    margin-top: 1rem;
    margin-bottom: 1rem;
    font-style: italic;
    color: var(--color-theme-muted);
  }

  :global(.ProseMirror .selectedCell:after) {
    z-index: 2;
    position: absolute;
    content: "";
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    background: color-mix(in srgb, var(--color-theme-primary), transparent 90%);
    pointer-events: none;
  }

  :global(.ProseMirror p.is-editor-empty:first-child::before) {
    color: var(--color-theme-muted);
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }
</style>
