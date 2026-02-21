<script lang="ts">
  import { type Editor } from "@tiptap/core";

  let { editor } = $props<{ editor: Editor | null }>();

  let element: HTMLDivElement;

  // Active states
  let isBold = $derived(editor?.isActive("bold") ?? false);
  let isItalic = $derived(editor?.isActive("italic") ?? false);
  let isLink = $derived(editor?.isActive("link") ?? false);

  const setLink = () => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };
</script>

<!-- The element bound here must be passed to BubbleMenu extension -->
<div
  bind:this={element}
  class="bubble-menu flex gap-1 p-1 bg-theme-surface border border-theme-border rounded shadow-xl shadow-black/20"
  data-testid="bubble-menu"
>
  <button
    onclick={() => editor?.chain().focus().toggleBold().run()}
    class="menu-btn {isBold ? 'active' : ''}"
    aria-label="Bold"
  >
    <span class="icon-[lucide--bold] w-4 h-4"></span>
  </button>
  <button
    onclick={() => editor?.chain().focus().toggleItalic().run()}
    class="menu-btn {isItalic ? 'active' : ''}"
    aria-label="Italic"
  >
    <span class="icon-[lucide--italic] w-4 h-4"></span>
  </button>
  <button
    onclick={setLink}
    class="menu-btn {isLink ? 'active' : ''}"
    aria-label="Link"
  >
    <span class="icon-[lucide--link] w-4 h-4"></span>
  </button>
</div>

<style>
  .bubble-menu {
    visibility: hidden; /* Hidden by default, visibility controlled by Tiptap */
    opacity: 0;
    transition: opacity 0.2s;
  }

  /* When Tiptap's BubbleMenu marks the menu as active, make it visible */
  :global(.bubble-menu.is-active) {
    visibility: visible;
    opacity: 1;
  }

  /* Tiptap will manage visibility via Tippy.js / class toggling, but requires the element to be in DOM */

  .menu-btn {
    padding: 0.375rem; /* p-1.5 */
    border-radius: 0.25rem; /* rounded */
    color: var(
      --color-theme-text-muted,
      color-mix(in srgb, var(--color-theme-text) 75%, transparent)
    );
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .menu-btn:hover {
    color: var(--color-theme-primary);
    background-color: color-mix(
      in srgb,
      var(--color-theme-primary) 20%,
      transparent
    );
  }

  .menu-btn.active {
    color: var(--color-theme-primary);
    background-color: color-mix(
      in srgb,
      var(--color-theme-primary) 40%,
      transparent
    );
  }
</style>
