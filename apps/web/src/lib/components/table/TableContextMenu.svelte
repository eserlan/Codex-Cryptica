<script lang="ts">
  import { categories } from "$lib/stores/categories.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

  let { x, y, selectedIds, onManageLabels, onChangeType, onDelete, onClose } =
    $props<{
      x: number;
      y: number;
      selectedIds: string[];
      onManageLabels: () => void;
      onChangeType: (type: string) => void;
      onDelete: () => void;
      onClose: () => void;
    }>();

  let menuEl = $state<HTMLDivElement>();
  const isGuest = $derived(sessionModeStore.isGuestMode);
  const count = $derived(selectedIds.length);

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

<div
  bind:this={menuEl}
  role="menu"
  tabindex="0"
  aria-label="Table Context Menu"
  data-testid="entity-table-context-menu"
  class="fixed z-[100] bg-theme-surface border border-theme-border shadow-2xl rounded-lg overflow-visible min-w-[200px] py-1 animate-in fade-in zoom-in-95 duration-100"
  style:top="{y}px"
  style:left="{x}px"
  oncontextmenu={(e) => e.preventDefault()}
>
  {#if isGuest}
    <div
      class="px-4 py-2 text-[10px] uppercase font-bold text-theme-muted tracking-wider border-b border-theme-border/30"
    >
      Read-Only Guest Session
    </div>
  {/if}

  <!-- Manage Labels -->
  <button
    role="menuitem"
    disabled={isGuest}
    data-testid="context-menu-add-label"
    class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase tracking-widest disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-theme-text"
    onclick={() => {
      onManageLabels();
      onClose();
    }}
  >
    <span class="icon-[lucide--tags] w-3.5 h-3.5" aria-hidden="true"></span>
    Manage Labels
  </button>

  <!-- Change Type Submenu -->
  <div class="relative group/submenu">
    <button
      role="menuitem"
      disabled={isGuest}
      data-testid="context-menu-change-type"
      class="w-full text-left px-4 py-2.5 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase tracking-widest disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-theme-text"
    >
      <span class="icon-[lucide--folder-input] w-3.5 h-3.5" aria-hidden="true"
      ></span>
      Change Type
      <span
        class="icon-[lucide--chevron-right] w-3 h-3 ml-auto"
        aria-hidden="true"
      ></span>
    </button>

    {#if !isGuest}
      <div
        class="absolute left-full top-0 hidden group-hover/submenu:block bg-theme-surface border border-theme-border shadow-2xl rounded-lg min-w-[150px] py-1"
      >
        {#each categories.list as cat}
          <button
            role="menuitem"
            class="w-full text-left px-4 py-2 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-2 transition-colors"
            onclick={() => {
              onChangeType(cat.id);
              onClose();
            }}
          >
            <span class="icon-[lucide--circle] w-2 h-2" style:color={cat.color}
            ></span>
            {cat.label}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="border-t border-theme-border/30 my-1"></div>

  <!-- Delete Action -->
  <button
    role="menuitem"
    disabled={isGuest}
    data-testid="context-menu-delete"
    class="w-full text-left px-4 py-2.5 text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-3 transition-colors uppercase tracking-widest disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-red-500"
    onclick={() => {
      onDelete();
      onClose();
    }}
  >
    <span class="icon-[lucide--trash-2] w-3.5 h-3.5" aria-hidden="true"></span>
    Delete {count > 1 ? `${count} Selected` : "Entity"}
  </button>
</div>
