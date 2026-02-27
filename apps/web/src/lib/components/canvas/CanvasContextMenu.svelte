<script lang="ts">
  import { Trash2, Type } from "lucide-svelte";

  let {
    x,
    y,
    targetType = "node",
    onDelete,
    onRename,
    onClose,
  } = $props<{
    x: number;
    y: number;
    targetType?: "node" | "edge";
    onDelete: () => void;
    onRename?: () => void;
    onClose: () => void;
  }>();

  let menuEl = $state<HTMLDivElement>();

  $effect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuEl && !menuEl.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use a small timeout to avoid the click that opened the menu from closing it immediately
    const timer = setTimeout(() => {
      window.addEventListener("click", handleOutsideClick);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleOutsideClick);
    };
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  bind:this={menuEl}
  role="menu"
  tabindex="0"
  aria-label="Canvas Context Menu"
  class="fixed z-[100] bg-theme-surface border border-theme-border shadow-2xl rounded-lg overflow-hidden min-w-[160px] py-1 animate-in fade-in zoom-in-95 duration-100"
  style:top="{y}px"
  style:left="{x}px"
  oncontextmenu={(e) => e.preventDefault()}
>
  {#if targetType === "edge"}
    <button
      role="menuitem"
      class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase tracking-widest"
      onclick={() => {
        onRename?.();
        onClose();
      }}
    >
      <Type class="w-3.5 h-3.5" />
      Edit Label
    </button>
    <div class="border-t border-theme-border/30 my-1"></div>
  {/if}

  <button
    role="menuitem"
    class="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors uppercase tracking-widest"
    onclick={() => {
      onDelete();
      onClose();
    }}
  >
    <Trash2 class="w-3.5 h-3.5" />
    Delete
  </button>
</div>
