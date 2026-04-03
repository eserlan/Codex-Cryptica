<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import type { Entity } from "schema";
  import { Search, Filter, LayoutGrid } from "lucide-svelte";

  let {
    onSelect,
    onDragStart,
    class: className = "",
  }: {
    onSelect?: (entity: Entity) => void;
    onDragStart?: (event: DragEvent, entityId: string) => void;
    class?: string;
  } = $props();

  let searchQuery = $state("");
  let typeFilters = $state<string[]>(["all"]);

  const types = $derived.by(() => {
    const allEntities = vault.allEntities;
    const typesSet = new Set<string>(["all"]);
    for (let i = 0; i < allEntities.length; i++) {
      typesSet.add(allEntities[i].type);
    }
    return Array.from(typesSet);
  });

  const filteredEntities = $derived.by(() => {
    const allEntities = vault.allEntities;
    const filtered: Entity[] = [];
    const query = searchQuery.trim().toLowerCase();
    const filterAll = typeFilters.includes("all");

    if (!query) {
      for (let i = 0; i < allEntities.length; i++) {
        const e = allEntities[i];
        if (filterAll || typeFilters.includes(e.type)) {
          filtered.push(e);
        }
      }
      return filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    for (let i = 0; i < allEntities.length; i++) {
      const e = allEntities[i];
      const matchesSearch =
        e.title.toLowerCase().includes(query) ||
        e.content.toLowerCase().includes(query);
      const matchesType = filterAll || typeFilters.includes(e.type);

      if (matchesSearch && matchesType) {
        filtered.push(e);
      }
    }

    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  });

  function toggleTypeFilter(type: string, event: MouseEvent) {
    const isMulti = event.ctrlKey || event.metaKey;

    if (type === "all") {
      typeFilters = ["all"];
      return;
    }

    if (isMulti) {
      let newFilters = typeFilters.filter((f) => f !== "all");
      if (newFilters.includes(type)) {
        newFilters = newFilters.filter((f) => f !== type);
      } else {
        newFilters.push(type);
      }
      typeFilters = newFilters.length === 0 ? ["all"] : newFilters;
    } else {
      if (typeFilters.length === 1 && typeFilters[0] === type) {
        typeFilters = ["all"];
      } else {
        typeFilters = [type];
      }
    }
  }
</script>

<div class="flex flex-col h-full {className}">
  <div class="p-4 border-b border-theme-border">
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

    <div class="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
      <Filter class="w-3 h-3 text-theme-muted shrink-0 mr-1" />
      {#each types as type}
        <button
          onclick={(e) => toggleTypeFilter(type, e)}
          aria-label={`Filter by ${type}`}
          title={type.toUpperCase()}
          class="p-1.5 rounded-md flex items-center justify-center transition-all {typeFilters.includes(
            type,
          )
            ? 'bg-theme-primary text-theme-bg shadow-sm scale-110'
            : 'text-theme-muted hover:text-theme-text hover:bg-theme-primary/10'}"
        >
          {#if type === "all"}
            <LayoutGrid class="w-4 h-4" />
          {:else}
            {@const cat = categories.getCategory(type)}
            <span class="{getIconClass(cat?.icon)} w-4 h-4"></span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
    {#each filteredEntities as entity}
      <button
        type="button"
        draggable={!!onDragStart}
        ondragstart={(e) => onDragStart?.(e, entity.id)}
        onclick={() => onSelect?.(entity)}
        class="w-full text-left p-3 bg-theme-bg border border-theme-border rounded-lg hover:border-theme-primary transition-all group focus:ring-2 focus:ring-theme-primary focus:outline-none"
      >
        <div class="flex items-center justify-between mb-1">
          <span
            class="text-[9px] font-mono text-theme-muted uppercase tracking-tighter"
          >
            {entity.type}
          </span>
          {#if entity.labels && entity.labels.length > 0}
            <div class="flex gap-1 overflow-hidden">
              {#each entity.labels.slice(0, 2) as label}
                <span
                  class="text-[8px] px-1 bg-theme-primary/10 text-theme-primary rounded uppercase tracking-widest truncate max-w-[40px]"
                >
                  {label}
                </span>
              {/each}
            </div>
          {/if}
        </div>
        <div
          class="text-xs font-bold text-theme-text group-hover:text-theme-primary transition-colors truncate"
        >
          {entity.title}
        </div>
      </button>
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
