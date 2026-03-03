<script lang="ts">
  import { type Editor } from "@tiptap/core";
  import { onMount, onDestroy } from "svelte";

  let { editor, isZenMode, onToggleZenMode } = $props<{
    editor: Editor | null;
    isZenMode: boolean;
    onToggleZenMode: () => void;
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

  const handleKeydown = (e: KeyboardEvent) => {
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
        onclick={() => editor.chain().focus().toggleBold().run()}
        class="toolbar-btn {activeStates.isBold ? 'active' : ''}"
        title="Bold (Cmd+B)"
        aria-label="Bold (Cmd+B)"
      >
        <span class="icon-[lucide--bold] w-4 h-4"></span>
      </button>
      <button
        onclick={() => editor.chain().focus().toggleItalic().run()}
        class="toolbar-btn {activeStates.isItalic ? 'active' : ''}"
        title="Italic (Cmd+I)"
        aria-label="Italic (Cmd+I)"
      >
        <span class="icon-[lucide--italic] w-4 h-4"></span>
      </button>
      <button
        onclick={() => editor.chain().focus().toggleStrike().run()}
        class="toolbar-btn {activeStates.isStrike ? 'active' : ''}"
        title="Strike"
        aria-label="Strike"
      >
        <span class="icon-[lucide--strikethrough] w-4 h-4"></span>
      </button>
      <button
        onclick={() => editor.chain().focus().toggleCode().run()}
        class="toolbar-btn {activeStates.isCode ? 'active' : ''}"
        title="Code (Cmd+E)"
        aria-label="Code (Cmd+E)"
      >
        <span class="icon-[lucide--code] w-4 h-4"></span>
      </button>
    </div>

    <div class="w-px bg-theme-border/50 mx-1"></div>

    <!-- Headings -->
    <div class="flex gap-0.5">
      <button
        onclick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        class="toolbar-btn {activeStates.isH1 ? 'active' : ''}"
        title="Heading 1"
        aria-label="Heading 1"
      >
        <span class="icon-[lucide--heading-1] w-4 h-4"></span>
      </button>
      <button
        onclick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        class="toolbar-btn {activeStates.isH2 ? 'active' : ''}"
        title="Heading 2"
        aria-label="Heading 2"
      >
        <span class="icon-[lucide--heading-2] w-4 h-4"></span>
      </button>
      <button
        onclick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        class="toolbar-btn {activeStates.isH3 ? 'active' : ''}"
        title="Heading 3"
        aria-label="Heading 3"
      >
        <span class="icon-[lucide--heading-3] w-4 h-4"></span>
      </button>
    </div>

    <div class="w-px bg-theme-border/50 mx-1"></div>

    <!-- Lists & Structure -->
    <div class="flex gap-0.5">
      <button
        onclick={() => editor.chain().focus().toggleBulletList().run()}
        class="toolbar-btn {activeStates.isBulletList ? 'active' : ''}"
        title="Bullet List"
        aria-label="Bullet List"
      >
        <span class="icon-[lucide--list] w-4 h-4"></span>
      </button>
      <button
        onclick={() => editor.chain().focus().toggleOrderedList().run()}
        class="toolbar-btn {activeStates.isOrderedList ? 'active' : ''}"
        title="Ordered List"
        aria-label="Ordered List"
      >
        <span class="icon-[lucide--list-ordered] w-4 h-4"></span>
      </button>
      <button
        onclick={() => editor.chain().focus().toggleBlockquote().run()}
        class="toolbar-btn {activeStates.isBlockquote ? 'active' : ''}"
        title="Blockquote"
        aria-label="Blockquote"
      >
        <span class="icon-[lucide--quote] w-4 h-4"></span>
      </button>
    </div>

    <div class="w-px bg-theme-border/50 mx-1"></div>

    <!-- Insertions -->
    <div class="flex gap-0.5">
      <button
        onclick={setLink}
        class="toolbar-btn {activeStates.isLink ? 'active' : ''}"
        title="Link"
        aria-label="Link"
      >
        <span class="icon-[lucide--link] w-4 h-4"></span>
      </button>
    </div>

    <div class="flex-1"></div>

    <!-- Utility -->
    <div class="flex gap-1">
      {#if isZenMode}
        <button
          onclick={toggleZenMode}
          class="px-3 py-1 flex items-center gap-2 text-[10px] font-bold text-theme-accent border border-theme-accent/30 hover:border-theme-accent/50 transition-all uppercase font-header tracking-widest bg-theme-accent/10 rounded"
          title="Close Zen Mode"
          aria-label="Close Zen Mode"
        >
          <span class="icon-[lucide--x] w-3.5 h-3.5"></span>
          Close Zen Mode
        </button>
        <div class="w-px bg-theme-border/50 mx-1"></div>
      {/if}

      <button
        onclick={toggleZenMode}
        class="toolbar-btn {isZenMode ? 'active' : ''}"
        title={isZenMode ? "Exit Zen Mode (Esc)" : "Zen Mode (Cmd+Shift+F)"}
        aria-label={isZenMode
          ? "Exit Zen Mode (Esc)"
          : "Zen Mode (Cmd+Shift+F)"}
      >
        {#if isZenMode}
          <span class="icon-[lucide--minimize] w-4 h-4"></span>
        {:else}
          <span class="icon-[lucide--maximize] w-4 h-4"></span>
        {/if}
      </button>
    </div>
  </div>
{/if}

<style>
  .toolbar-btn {
    padding: 0.375rem; /* p-1.5 */
    border-radius: 0.25rem; /* rounded */
    color: color-mix(in srgb, var(--color-theme-text) 70%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .toolbar-btn:hover {
    color: var(--color-theme-primary);
    background-color: color-mix(
      in srgb,
      var(--color-theme-primary) 20%,
      transparent
    );
  }

  .toolbar-btn.active {
    color: var(--color-theme-primary);
    background-color: color-mix(
      in srgb,
      var(--color-theme-primary) 40%,
      transparent
    );
  }
</style>
