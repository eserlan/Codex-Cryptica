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

  const typesWithCounts = $derived.by(() => {
    const allEntities = vault.allEntities;
    const counts = new Map<string, number>();
    for (let i = 0; i < allEntities.length; i++) {
      const type = allEntities[i].type;
      counts.set(type, (counts.get(type) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => a.type.localeCompare(b.type));
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

    <div class="space-y-2">
      <div
        class="flex items-center gap-1.5 text-[10px] font-mono text-theme-muted uppercase tracking-wider"
      >
        <Filter class="w-3 h-3" />
        <span>Filter by category</span>
        {#if !typeFilters.includes("all")}
          <span
            class="ml-auto text-[9px] bg-theme-primary/20 text-theme-primary px-1.5 py-0.5 rounded"
          >
            {typeFilters.length} selected
          </span>
        {/if}
      </div>
      <div class="flex flex-wrap gap-1.5">
        <button
          onclick={() => (typeFilters = ["all"])}
          aria-label="Show all categories"
          class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all {typeFilters.includes(
            'all',
          )
            ? 'bg-theme-primary text-theme-bg shadow-sm'
            : 'bg-theme-bg border border-theme-border text-theme-muted hover:border-theme-primary/50 hover:text-theme-text'}"
        >
          <LayoutGrid class="w-3.5 h-3.5" />
          <span>All</span>
        </button>
        {#each typesWithCounts as { type, count }}
          {@const cat = categories.getCategory(type)}
          <button
            onclick={(e) => toggleTypeFilter(type, e)}
            aria-label={`Filter by ${cat?.label || type}`}
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all {typeFilters.includes(
              type,
            )
              ? 'shadow-sm'
              : 'bg-theme-bg border border-theme-border text-theme-muted hover:border-theme-primary/50 hover:text-theme-text'}"
            style={typeFilters.includes(type)
              ? `background-color: ${cat?.color || "#15803d"}20; border: 1px solid ${cat?.color || "#15803d"}; color: ${cat?.color || "#15803d"}`
              : ""}
          >
            <span class="{getIconClass(cat?.icon)} w-3.5 h-3.5"></span>
            <span>{cat?.label || type}</span>
            <span
              class="text-[10px] px-1 rounded-full {typeFilters.includes(type)
                ? 'bg-white/20'
                : 'bg-theme-primary/10 text-theme-muted'}"
            >
              {count}
            </span>
          </button>
        {/each}
      </div>
    </div>
  </div>

  <div class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
    {#each filteredEntities as entity}
      {@const cat = categories.getCategory(entity.type)}
      <button
        type="button"
        draggable={!!onDragStart}
        ondragstart={(e) => onDragStart?.(e, entity.id)}
        onclick={() => onSelect?.(entity)}
        data-testid="entity-list-item"
        data-entity-id={entity.id}
        title={`Select ${entity.title}`}
        class="w-full text-left p-2.5 bg-theme-bg border border-theme-border rounded-lg hover:border-theme-primary/50 hover:bg-theme-primary/5 transition-all group focus:ring-1 focus:ring-theme-primary focus:outline-none"
      >
        <div class="flex items-center gap-2">
          <span
            class="{getIconClass(
              cat?.icon,
            )} w-3.5 h-3.5 shrink-0 text-theme-primary/70 group-hover:text-theme-primary transition-colors"
          ></span>
          <div class="flex-1 min-w-0">
            <div
              class="text-xs font-bold text-theme-text group-hover:text-theme-primary transition-colors truncate uppercase font-header tracking-widest"
            >
              {entity.title}
            </div>
          </div>
          {#if entity.labels && entity.labels.length > 0}
            <div class="flex gap-1 shrink-0 ml-auto flex-wrap justify-end">
              {#each entity.labels as label}
                <span
                  class="text-[7px] px-1 bg-theme-primary/10 text-theme-primary rounded uppercase tracking-[0.1em] truncate max-w-[40px] font-mono"
                >
                  {label}
                </span>
              {/each}
            </div>
          {/if}
        </div>
      </button>
    {:else}
      <div class="text-center py-10 px-4" data-testid="no-entities-found">
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
