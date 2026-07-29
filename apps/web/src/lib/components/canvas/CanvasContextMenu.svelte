<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

  let {
    x,
    y,
    targetId,
    targetType = "node",
    isAdventure = false,
    onDelete,
    onRename,
    onRevise,
    onCreateEntity,
    onAddAdventureNode,
    onClose,
  } = $props<{
    x: number;
    y: number;
    targetId?: string;
    targetType?: "node" | "edge" | "pane";
    isAdventure?: boolean;
    onDelete: () => void;
    onRename?: () => void;
    onRevise?: () => void;
    onCreateEntity?: (type: string) => void;
    onAddAdventureNode?: (
      type: "location" | "npc" | "clue" | "threat" | "outcome" | "situation",
    ) => void;
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
      {#if isAdventure}
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onAddAdventureNode?.("location");
            onClose();
          }}
        >
          <span class="icon-[lucide--map-pin] w-3.5 h-3.5 text-amber-400"
          ></span>
          Add Location
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onAddAdventureNode?.("npc");
            onClose();
          }}
        >
          <span class="icon-[lucide--users] w-3.5 h-3.5 text-blue-400"></span>
          Add NPC / Faction
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onAddAdventureNode?.("clue");
            onClose();
          }}
        >
          <span class="icon-[lucide--search] w-3.5 h-3.5 text-emerald-400"
          ></span>
          Add Clue / Secret
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onAddAdventureNode?.("threat");
            onClose();
          }}
        >
          <span class="icon-[lucide--skull] w-3.5 h-3.5 text-rose-400"></span>
          Add Threat
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onAddAdventureNode?.("outcome");
            onClose();
          }}
        >
          <span class="icon-[lucide--flag] w-3.5 h-3.5 text-cyan-400"></span>
          Add Outcome
        </button>
        <button
          role="menuitem"
          class="w-full text-left px-4 py-2 text-xs text-theme-text hover:bg-theme-primary/10 hover:text-theme-primary flex items-center gap-3 transition-colors uppercase font-header tracking-widest"
          onclick={() => {
            onAddAdventureNode?.("situation");
            onClose();
          }}
        >
          <span class="icon-[lucide--play] w-3.5 h-3.5 text-purple-400"></span>
          Add Situation
        </button>
      {:else}
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
