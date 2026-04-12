<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { themeStore } from "$lib/stores/theme.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import type { Entity } from "schema";
  import { Search, LayoutGrid } from "lucide-svelte";

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
  let typeFilters = $state<Set<string>>(new Set());
  const isFantasyTheme = $derived(themeStore.activeTheme.id === "fantasy");

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
    const filterAll = typeFilters.size === 0;

    if (!query) {
      for (let i = 0; i < allEntities.length; i++) {
        const e = allEntities[i];
        if (filterAll || typeFilters.has(e.type)) {
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
      const matchesType = filterAll || typeFilters.has(e.type);

      if (matchesSearch && matchesType) {
        filtered.push(e);
      }
    }

    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  });

  function toggleTypeFilter(type: string, event: MouseEvent) {
    const isMulti = event.ctrlKey || event.metaKey;

    if (type === "all") {
      typeFilters = new Set();
      return;
    }

    if (isMulti) {
      const newFilters = new Set(typeFilters);
      if (newFilters.has(type)) {
        newFilters.delete(type);
      } else {
        newFilters.add(type);
      }
      typeFilters = newFilters;
    } else {
      if (typeFilters.has(type)) {
        typeFilters = new Set();
      } else {
        typeFilters = new Set([type]);
      }
    }
  }
</script>

<div class="flex flex-col h-full min-h-0 {className}">
  <div class="p-4 border-b border-theme-border shrink-0">
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

    <div
      class="flex items-center gap-1 px-2 py-1.5 border border-theme-border rounded shadow-sm"
      style:background-color={isFantasyTheme
        ? "var(--theme-panel-muted)"
        : undefined}
    >
      <button
        onclick={() => (typeFilters = new Set())}
        title="Show all categories"
        aria-label="Show all categories"
        class="p-1.5 rounded-md flex items-center justify-center transition-all border {typeFilters.size ===
        0
          ? isFantasyTheme
            ? 'text-[color:var(--theme-focus)] shadow-none border-[color:var(--theme-focus-border)]'
            : 'bg-theme-primary text-theme-bg shadow-sm scale-110 border-theme-primary'
          : isFantasyTheme
            ? 'border-transparent text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-title-ink)]'
            : 'border-transparent text-theme-muted hover:text-theme-text hover:bg-theme-primary/10'}"
        style:background-color={typeFilters.size === 0 && isFantasyTheme
          ? "var(--theme-focus-bg)"
          : undefined}
      >
        <LayoutGrid class="w-3.5 h-3.5" />
      </button>

      {#each categories.list as cat (cat.id)}
        {@const count =
          typesWithCounts.find((t) => t.type === cat.id)?.count || 0}
        {#if count > 0 || typeFilters.has(cat.id)}
          <button
            onclick={(e) => toggleTypeFilter(cat.id, e)}
            title={cat.label}
            aria-label={`Filter by ${cat.label}`}
            aria-pressed={typeFilters.has(cat.id)}
            class="relative p-1.5 rounded-md flex items-center justify-center transition-all border {typeFilters.has(
              cat.id,
            )
              ? isFantasyTheme
                ? 'text-[color:var(--theme-focus)] shadow-none border-[color:var(--theme-focus-border)]'
                : 'bg-theme-primary text-theme-bg shadow-sm scale-110 border-theme-primary'
              : isFantasyTheme
                ? 'border-transparent text-[color:var(--theme-icon-default)] hover:text-[color:var(--theme-title-ink)]'
                : 'border-transparent text-theme-muted hover:text-theme-text hover:bg-theme-primary/10'}"
            style:background-color={typeFilters.has(cat.id) && isFantasyTheme
              ? "var(--theme-focus-bg)"
              : undefined}
          >
            <span
              class="{getIconClass(cat.icon)} w-3.5 h-3.5"
              style={!typeFilters.has(cat.id)
                ? isFantasyTheme
                  ? "color: var(--theme-icon-default)"
                  : `color: ${cat.color}`
                : isFantasyTheme
                  ? "color: var(--theme-focus)"
                  : ""}
            ></span>
            {#if count > 0 && !typeFilters.has(cat.id)}
              <span
                class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[7px] font-bold flex items-center justify-center leading-none"
                style:background-color={isFantasyTheme
                  ? "var(--theme-focus-bg)"
                  : undefined}
                style:color={isFantasyTheme ? "var(--theme-focus)" : undefined}
              >
                {count > 9 ? "9+" : count}
              </span>
            {/if}
          </button>
        {/if}
      {/each}
    </div>
  </div>

  <div
    class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar overscroll-contain"
    style="touch-action: pan-y;"
  >
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
        class="w-full text-left p-2.5 border border-theme-border transition-all group focus:ring-1 focus:ring-theme-primary focus:outline-none {isFantasyTheme
          ? 'bg-[color:var(--theme-panel-muted)] rounded-md hover:border-[color:var(--theme-selected-border)] hover:bg-[color:var(--theme-selected-bg)]'
          : 'bg-theme-bg rounded-lg hover:border-theme-primary/50 hover:bg-theme-primary/5'}"
      >
        <div class="flex items-center gap-2">
          <span
            class="{getIconClass(
              cat?.icon,
            )} w-3.5 h-3.5 shrink-0 transition-colors {isFantasyTheme
              ? 'text-[color:var(--theme-icon-default)] group-hover:text-[color:var(--theme-icon-active)]'
              : 'text-theme-primary/70 group-hover:text-theme-primary'}"
          ></span>
          <div class="flex-1 min-w-0">
            <div
              class="text-xs font-bold transition-colors truncate uppercase font-header tracking-widest {isFantasyTheme
                ? 'text-[color:var(--theme-title-ink)] group-hover:text-[color:var(--theme-icon-active)]'
                : 'text-theme-text group-hover:text-theme-primary'}"
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
