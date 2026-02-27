<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { Search, Filter } from "lucide-svelte";

  let searchQuery = $state("");
  let typeFilter = $state<string>("all");

  const types = $derived([
    "all",
    ...new Set(vault.allEntities.map((e) => e.type)),
  ]);

  const filteredEntities = $derived(
    vault.allEntities
      .filter((e) => {
        const matchesSearch =
          e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.content?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === "all" || e.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => a.title.localeCompare(b.title)),
  );

  function onDragStart(event: DragEvent, entityId: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData("application/codex-entity", entityId);
      event.dataTransfer.effectAllowed = "move";
    }
  }
</script>

<div
  class="w-72 h-full bg-theme-surface border-r border-theme-border flex flex-col"
>
  <div class="p-4 border-b border-theme-border">
    <h2
      class="text-xs font-bold text-theme-primary uppercase tracking-[0.2em] mb-4"
    >
      Entity Palette
    </h2>

    <div class="relative mb-3">
      <Search
        class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-muted"
      />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search entities..."
        aria-label="Search entities"
        class="w-full bg-theme-bg border border-theme-border rounded-md pl-9 pr-3 py-2 text-xs text-theme-text focus:outline-none focus:border-theme-primary transition-colors"
      />
    </div>

    <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
      <Filter class="w-3 h-3 text-theme-muted shrink-0" />
      {#each types as type}
        <button
          onclick={() => (typeFilter = type)}
          aria-label={`Filter by ${type}`}
          class="px-2 py-1 rounded text-[10px] whitespace-nowrap transition-colors {typeFilter ===
          type
            ? 'bg-theme-primary text-theme-bg font-bold'
            : 'text-theme-muted hover:text-theme-text'}"
        >
          {type}
        </button>
      {/each}
    </div>
  </div>

  <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
    {#each filteredEntities as entity}
      <div
        draggable="true"
        ondragstart={(e) => onDragStart(e, entity.id)}
        role="button"
        tabindex="0"
        aria-label={`Drag ${entity.title} to canvas`}
        onkeydown={(e) =>
          e.key === "Enter" &&
          window.dispatchEvent(
            new CustomEvent("add-to-canvas", {
              detail: { entityId: entity.id },
            }),
          )}
        class="p-3 bg-theme-bg border border-theme-border rounded-lg cursor-grab active:cursor-grabbing hover:border-theme-primary transition-all group focus:ring-2 focus:ring-theme-primary focus:outline-none"
      >
        <div class="flex items-center justify-between mb-1">
          <span
            class="text-[9px] font-mono text-theme-muted uppercase tracking-tighter"
          >
            {entity.type}
          </span>
        </div>
        <div
          class="text-xs font-bold text-theme-text group-hover:text-theme-primary transition-colors truncate"
        >
          {entity.title}
        </div>
      </div>
    {:else}
      <div class="text-center py-10 px-4">
        <p class="text-xs text-theme-muted">No entities found</p>
      </div>
    {/each}
  </div>
</div>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
