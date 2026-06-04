<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  let {
    x,
    y,
    targetId,
    targetType = "node",
    onDelete,
    onRename,
    onRevise,
    onCreateEntity,
    onClose,
  } = $props<{
    x: number;
    y: number;
    targetId?: string;
    targetType?: "node" | "edge" | "pane";
    onDelete: () => void;
    onRename?: () => void;
    onRevise?: () => void;
    onCreateEntity?: (type: string) => void;
    onClose: () => void;
  }>();

  const handleRevise = async () => {
    if (targetType !== "node") return;

    if (targetId) {
      modalUIStore.openRevisionDialog(targetId);
      onClose();
    } else if (onRevise) {
      onRevise();
      onClose();
    }
  };

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
  {#if !vault.isGuest}
    {#if targetType === "edge"}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase tracking-widest"
        onclick={() => {
          onRename?.();
          onClose();
        }}
      >
        <span class="icon-[lucide--type] w-3.5 h-3.5"></span>
        Edit Label
      </button>
      <div class="border-t border-theme-border/30 my-1"></div>
    {/if}

    {#if targetType === "pane"}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
        onclick={() => {
          onCreateEntity?.("character");
          onClose();
        }}
      >
        Create Character
      </button>
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
        onclick={() => {
          onCreateEntity?.("location");
          onClose();
        }}
      >
        Create Location
      </button>
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
        onclick={() => {
          onCreateEntity?.("event");
          onClose();
        }}
      >
        Create Event
      </button>
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
        onclick={() => {
          onCreateEntity?.("item");
          onClose();
        }}
      >
        Create Item
      </button>
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
        onclick={() => {
          onCreateEntity?.("lore");
          onClose();
        }}
      >
        Create Lore
      </button>
    {/if}

    {#if targetType === "node" && (targetId || onRevise)}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
        onclick={handleRevise}
      >
        <span class="icon-[lucide--sparkles] w-3.5 h-3.5 opacity-70"></span>
        Revise Content
      </button>
      <div class="border-t border-theme-border/30 my-1"></div>
    {/if}

    {#if targetType !== "pane"}
      <button
        role="menuitem"
        class="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
        onclick={() => {
          onDelete();
          onClose();
        }}
      >
        <span class="icon-[lucide--trash-2] w-3.5 h-3.5"></span>
        Delete
      </button>
    {/if}
  {:else}
    <div
      class="px-4 py-3 text-[10px] text-theme-muted italic uppercase tracking-widest"
    >
      Viewer Mode
    </div>
  {/if}
</div>
