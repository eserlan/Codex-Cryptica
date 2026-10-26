<script lang="ts">
  import { type Editor } from "@tiptap/core";
  import { onMount, onDestroy } from "svelte";
  import EditorTableActions from "./EditorTableActions.svelte";
  import EditorZenActions from "./EditorZenActions.svelte";

  let {
    editor,
    isZenMode,
    onToggleZenMode,
    compact = false,
  } = $props<{
    editor: Editor | null;
    isZenMode: boolean;
    onToggleZenMode: () => void;
    /** Inline marks and lists only: no headings, link/table, or Zen mode. */
    compact?: boolean;
  }>();

  // Optimization: Single state object for all formatting states.
  // Assignment to its properties only triggers reactivity if the value actually changes.
  let activeStates = $state({
    isBold: false,
    isItalic: false,
    isStrike: false,
    isCode: false,
    isH1: false,
    isH2: false,
    isH3: false,
    isBulletList: false,
    isOrderedList: false,
    isBlockquote: false,
    isLink: false,
    isTable: false,
  });

  $effect(() => {
    if (!editor) return;
    const currentEditor = editor;

    const update = () => {
      activeStates.isBold = currentEditor?.isActive("bold") ?? false;
      activeStates.isItalic = currentEditor?.isActive("italic") ?? false;
      activeStates.isStrike = currentEditor?.isActive("strike") ?? false;
      activeStates.isCode = currentEditor?.isActive("code") ?? false;
      activeStates.isH1 =
        currentEditor?.isActive("heading", { level: 1 }) ?? false;
      activeStates.isH2 =
        currentEditor?.isActive("heading", { level: 2 }) ?? false;
      activeStates.isH3 =
        currentEditor?.isActive("heading", { level: 3 }) ?? false;
      activeStates.isBulletList =
        currentEditor?.isActive("bulletList") ?? false;
      activeStates.isOrderedList =
        currentEditor?.isActive("orderedList") ?? false;
      activeStates.isBlockquote =
        currentEditor?.isActive("blockquote") ?? false;
      activeStates.isLink = currentEditor?.isActive("link") ?? false;
      activeStates.isTable = currentEditor?.isActive("table") ?? false;
    };

    // Initial update
    update();

    currentEditor.on("selectionUpdate", update);
    currentEditor.on("transaction", update);

    return () => {
      currentEditor.off("selectionUpdate", update);
      currentEditor.off("transaction", update);
    };
  });

  const toggleZenMode = () => {
    onToggleZenMode();
  };

  const setLink = () => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    // update
    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  const insertTable = () => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  };

  const handleKeydown = (e: KeyboardEvent) => {
    // No Zen mode in the compact variant, so its shortcuts must not fire either.
    if (compact) return;
    // Toggle Zen Mode on Escape if active, but do not block other handlers/defaults
    if (e.key === "Escape" && isZenMode && !e.defaultPrevented) {
      e.preventDefault();
      toggleZenMode();
    }
    // Toggle Zen Mode on Cmd+Shift+F
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "f") {
      e.preventDefault();
      toggleZenMode();
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeydown);
  });
</script>

{#if editor}
  <div
    class="editor-toolbar flex flex-wrap gap-1 p-2 bg-theme-surface border-b border-theme-border sticky top-0 z-40"
  >
    <!-- Basic Formatting -->
    <div class="flex gap-0.5">
      <button
        type="button"
        onclick={() => editor.chain().focus().toggleBold().run()}
        class="toolbar-btn {activeStates.isBold ? 'active' : ''}"
        title="Bold (Cmd+B)"
        aria-label="Bold (Cmd+B)"
        aria-pressed={activeStates.isBold}
      >
        <span class="icon-[lucide--bold] w-4 h-4" aria-hidden="true"></span>
      </button>
      <button
        type="button"
        onclick={() => editor.chain().focus().toggleItalic().run()}
        class="toolbar-btn {activeStates.isItalic ? 'active' : ''}"
        title="Italic (Cmd+I)"
        aria-label="Italic (Cmd+I)"
        aria-pressed={activeStates.isItalic}
      >
        <span class="icon-[lucide--italic] w-4 h-4" aria-hidden="true"></span>
      </button>
      <button
        type="button"
        onclick={() => editor.chain().focus().toggleStrike().run()}
        class="toolbar-btn {activeStates.isStrike ? 'active' : ''}"
        title="Strike"
        aria-label="Strike"
        aria-pressed={activeStates.isStrike}
      >
        <span class="icon-[lucide--strikethrough] w-4 h-4" aria-hidden="true"
        ></span>
      </button>
      <button
        type="button"
        onclick={() => editor.chain().focus().toggleCode().run()}
        class="toolbar-btn {activeStates.isCode ? 'active' : ''}"
        title="Code (Cmd+E)"
        aria-label="Code (Cmd+E)"
        aria-pressed={activeStates.isCode}
      >
        <span class="icon-[lucide--code] w-4 h-4" aria-hidden="true"></span>
      </button>
    </div>

    {#if !compact}
      <div class="w-px bg-theme-border/50 mx-1"></div>

      <!-- Headings -->
      <div class="flex gap-0.5">
        <button
          type="button"
          onclick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()}
          class="toolbar-btn {activeStates.isH1 ? 'active' : ''}"
          title="Heading 1"
          aria-label="Heading 1"
          aria-pressed={activeStates.isH1}
        >
          <span class="icon-[lucide--heading-1] w-4 h-4" aria-hidden="true"
          ></span>
        </button>
        <button
          type="button"
          onclick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()}
          class="toolbar-btn {activeStates.isH2 ? 'active' : ''}"
          title="Heading 2"
          aria-label="Heading 2"
          aria-pressed={activeStates.isH2}
        >
          <span class="icon-[lucide--heading-2] w-4 h-4" aria-hidden="true"
          ></span>
        </button>
        <button
          type="button"
          onclick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()}
          class="toolbar-btn {activeStates.isH3 ? 'active' : ''}"
          title="Heading 3"
          aria-label="Heading 3"
          aria-pressed={activeStates.isH3}
        >
          <span class="icon-[lucide--heading-3] w-4 h-4" aria-hidden="true"
          ></span>
        </button>
      </div>

      <div class="w-px bg-theme-border/50 mx-1"></div>
    {/if}

    <!-- Lists & Structure -->
    <div class="flex gap-0.5">
      <button
        type="button"
        onclick={() => editor.chain().focus().toggleBulletList().run()}
        class="toolbar-btn {activeStates.isBulletList ? 'active' : ''}"
        title="Bullet List"
        aria-label="Bullet List"
        aria-pressed={activeStates.isBulletList}
      >
        <span class="icon-[lucide--list] w-4 h-4" aria-hidden="true"></span>
      </button>
      <button
        type="button"
        onclick={() => editor.chain().focus().toggleOrderedList().run()}
        class="toolbar-btn {activeStates.isOrderedList ? 'active' : ''}"
        title="Ordered List"
        aria-label="Ordered List"
        aria-pressed={activeStates.isOrderedList}
      >
        <span class="icon-[lucide--list-ordered] w-4 h-4" aria-hidden="true"
        ></span>
      </button>
      <button
        type="button"
        onclick={() => editor.chain().focus().toggleBlockquote().run()}
        class="toolbar-btn {activeStates.isBlockquote ? 'active' : ''}"
        title="Blockquote"
        aria-label="Blockquote"
        aria-pressed={activeStates.isBlockquote}
      >
        <span class="icon-[lucide--quote] w-4 h-4" aria-hidden="true"></span>
      </button>
    </div>

    {#if !compact}
      <div class="w-px bg-theme-border/50 mx-1"></div>

      <!-- Insertions -->
      <div class="flex gap-0.5">
        <button
          type="button"
          onclick={setLink}
          class="toolbar-btn {activeStates.isLink ? 'active' : ''}"
          title="Link"
          aria-label="Link"
          aria-pressed={activeStates.isLink}
        >
          <span class="icon-[lucide--link] w-4 h-4" aria-hidden="true"></span>
        </button>
        <button
          type="button"
          onclick={insertTable}
          class="toolbar-btn"
          title="Insert Table"
          aria-label="Insert Table"
        >
          <span class="icon-[lucide--table] w-4 h-4" aria-hidden="true"></span>
        </button>
      </div>

      {#if activeStates.isTable}
        <div class="w-px bg-theme-border/50 mx-1"></div>

        <EditorTableActions {editor} />
      {/if}
    {/if}

    <div class="flex-1"></div>

    <!-- Utility -->
    {#if !compact}
      <EditorZenActions {isZenMode} onToggle={toggleZenMode} />
    {/if}
  </div>
{/if}

<style>
  :global(.editor-toolbar .toolbar-btn) {
    padding: 0.375rem; /* p-1.5 */
    border-radius: 0.25rem; /* rounded */
    color: color-mix(in srgb, var(--color-theme-text) 70%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  :global(.editor-toolbar .toolbar-btn:hover) {
    color: var(--color-theme-primary);
    background-color: color-mix(
      in srgb,
      var(--color-theme-primary) 20%,
      transparent
    );
  }

  :global(.editor-toolbar .toolbar-btn.active) {
    color: var(--color-theme-primary);
    background-color: color-mix(
      in srgb,
      var(--color-theme-primary) 40%,
      transparent
    );
  }
</style>
