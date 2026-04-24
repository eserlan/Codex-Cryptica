<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { uiStore } from "$lib/stores/ui.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import { groupEntitiesForExplorer } from "./entityListGrouping";
  import type { Entity } from "schema";
  import {
    ChevronDown,
    ChevronRight,
    Search,
    LayoutGrid,
    List,
    Tag,
    X,
  } from "lucide-svelte";

  let {
    onSelect,
    onDragStart,
    onDragEnd,
    onOpenZen,
    allowedTypes = null,
    showDraftsOnly = false,
    class: className = "",
  }: {
    onSelect?: (entity: Entity) => void;
    onDragStart?: (event: DragEvent, entityId: string) => void;
    onDragEnd?: () => void;
    onOpenZen?: (entity: Entity) => void;
    allowedTypes?: string[] | null;
    showDraftsOnly?: boolean;
    class?: string;
  } = $props();

  let searchQuery = $state("");
  let typeFilters = $state<Set<string>>(new Set());
  const activeVaultId = $derived(vault.activeVaultId);
  const labelFilters = $derived(uiStore.labelFilters);
  const focusedEntityId = $derived(uiStore.focusedEntityId);
  const viewMode = $derived(uiStore.explorerViewMode);
  const allowedTypeSet = $derived.by(() =>
    allowedTypes ? new Set(allowedTypes) : null,
  );
  const visibleCategories = $derived.by(() =>
    categories.list.filter(
      (cat) => !allowedTypeSet || allowedTypeSet.has(cat.id),
    ),
  );
  const collapsedLabelGroups = $derived.by(() =>
    uiStore.getCollapsedLabelGroups(activeVaultId),
  );

  // ⚡ Bolt Optimization: Return the Map directly to avoid intermediate array allocations,
  // mapping, and sorting. This also turns an O(N) .find into an O(1) Map .get lookup in the loop.
  const typeCounts = $derived.by(() => {
    const allEntities = vault.allEntities;
    const counts = new Map<string, number>();
    for (let i = 0; i < allEntities.length; i++) {
      const e = allEntities[i];
      if (allowedTypeSet && !allowedTypeSet.has(e.type)) {
        continue;
      }
      if (showDraftsOnly && e.status !== "draft") {
        continue;
      }
      if (!showDraftsOnly && e.status === "draft") {
        continue;
      }
      counts.set(e.type, (counts.get(e.type) || 0) + 1);
    }
    return counts;
  });

  const filteredEntities = $derived.by(() => {
    const allEntities = vault.allEntities;
    const filtered: Entity[] = [];
    const query = searchQuery.trim().toLowerCase();
    const filterAllTypes = typeFilters.size === 0;
    const activeLabels = Array.from(labelFilters);

    for (let i = 0; i < allEntities.length; i++) {
      const e = allEntities[i];

      if (allowedTypeSet && !allowedTypeSet.has(e.type)) {
        continue;
      }

      // Filter by draft status
      if (showDraftsOnly && e.status !== "draft") {
        continue;
      }
      if (!showDraftsOnly && e.status === "draft") {
        continue;
      }

      const matchesSearch =
        !query ||
        e.title.toLowerCase().includes(query) ||
        e.content.toLowerCase().includes(query) ||
        e.labels?.some((l) => l.toLowerCase().includes(query));

      const matchesType = filterAllTypes || typeFilters.has(e.type);

      // AND logic for labels
      const matchesLabels =
        activeLabels.length === 0 ||
        (e.labels && activeLabels.every((f) => e.labels?.includes(f)));

      if (matchesSearch && matchesType && matchesLabels) {
        filtered.push(e);
      }
    }

    return filtered.sort((a, b) => a.title.localeCompare(b.title));
  });

  const groupedEntities = $derived.by(() => {
    return groupEntitiesForExplorer(filteredEntities, viewMode);
  });

  function toggleTypeFilter(type: string, event: MouseEvent) {
    if (allowedTypeSet && !allowedTypeSet.has(type)) {
      return;
    }

    const isMulti = event.ctrlKey || event.metaKey;

    if (type === "all") {
      typeFilters = new Set();
      uiStore.clearLabelFilters();
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

  function getIconToggleClasses(active: boolean) {
    return active
      ? "rounded-lg border border-theme-primary bg-theme-primary text-theme-bg shadow-sm transition-all hover:border-theme-secondary hover:bg-theme-secondary"
      : "rounded-lg border border-theme-border bg-theme-bg/50 text-theme-muted transition-all hover:bg-theme-bg hover:text-theme-text";
  }

  $effect(() => {
    if (!allowedTypeSet || typeFilters.size === 0) {
      return;
    }

    const nextFilters = new Set(
      Array.from(typeFilters).filter((type) => allowedTypeSet.has(type)),
    );
    if (nextFilters.size !== typeFilters.size) {
      typeFilters = nextFilters;
    }
  });
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
        class="w-full rounded-lg border border-theme-border bg-theme-bg/50 py-2 pl-9 pr-3 text-sm text-theme-text placeholder-theme-muted transition-all focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent/20"
      />
    </div>

    <div
      class="flex items-center gap-1 rounded-xl border border-theme-border bg-theme-surface/50 px-2 py-1.5 shadow-sm"
    >
      <button
        onclick={(e) => toggleTypeFilter("all", e)}
        title="Show all categories"
        aria-label="Show all categories"
        aria-pressed={typeFilters.size === 0}
        class="flex items-center justify-center p-1.5 {getIconToggleClasses(
          typeFilters.size === 0,
        )}"
      >
        <LayoutGrid class="w-3.5 h-3.5" />
      </button>

      {#each visibleCategories as cat (cat.id)}
        {@const count = typeCounts.get(cat.id) || 0}
        {#if count > 0 || typeFilters.has(cat.id)}
          <button
            onclick={(e) => toggleTypeFilter(cat.id, e)}
            title={cat.label}
            aria-label={`Filter by ${cat.label}`}
            aria-pressed={typeFilters.has(cat.id)}
            class="relative flex items-center justify-center p-1.5 {getIconToggleClasses(
              typeFilters.has(cat.id),
            )}"
          >
            <span
              class="{getIconClass(cat.icon)} w-3.5 h-3.5"
              style={typeFilters.has(cat.id)
                ? undefined
                : `color: ${cat.color}`}
            ></span>
            {#if count > 0 && !typeFilters.has(cat.id)}
              <span
                class="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-theme-primary/10 text-[7px] font-bold leading-none text-theme-primary"
              >
                {count > 9 ? "9+" : count}
              </span>
            {/if}
          </button>
        {/if}
      {/each}

      <div class="w-px h-3.5 bg-theme-border mx-0.5 opacity-50"></div>

      <button
        onclick={() => uiStore.setExplorerViewMode("list")}
        title="List View"
        aria-label="List View"
        aria-pressed={viewMode === "list"}
        class="flex items-center justify-center p-1.5 {getIconToggleClasses(
          viewMode === 'list',
        )}"
      >
        <List class="w-3.5 h-3.5" />
      </button>

      <button
        onclick={() => uiStore.setExplorerViewMode("label")}
        title="Group by Label"
        aria-label="Group by Label"
        aria-pressed={viewMode === "label"}
        class="flex items-center justify-center p-1.5 {getIconToggleClasses(
          viewMode === 'label',
        )}"
      >
        <Tag class="w-3.5 h-3.5" />
      </button>
    </div>

    {#if labelFilters.size > 0}
      <div
        class="mt-3 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
      >
        {#each Array.from(labelFilters).sort() as label}
          <div
            class="flex items-center gap-1 px-2 py-0.5 rounded-md bg-theme-primary/10 border border-theme-primary/20 text-[9px] font-bold text-theme-primary uppercase tracking-wider"
          >
            <span>{label}</span>
            <button
              onclick={() => uiStore.removeLabelFilter(label)}
              class="hover:text-theme-text transition-colors"
              aria-label={`Remove ${label} filter`}
            >
              <X class="w-2.5 h-2.5" />
            </button>
          </div>
        {/each}
        <button
          onclick={() => uiStore.clearLabelFilters()}
          class="px-2 py-0.5 text-[9px] font-bold text-theme-muted hover:text-theme-primary uppercase tracking-wider transition-colors"
        >
          Clear All
        </button>
      </div>
    {/if}
  </div>

  <div
    class="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar"
    style="touch-action: pan-y;"
  >
    {#snippet entityItem(entity: Entity)}
      {@const cat = categories.getCategory(entity.type)}
      <div
        class="group relative flex items-center rounded-xl border transition-all {entity.id ===
        focusedEntityId
          ? 'border-theme-primary bg-theme-primary/10 ring-2 ring-theme-accent/20'
          : 'border-theme-border bg-theme-surface/50 hover:border-theme-primary/50 hover:bg-theme-primary/5'}"
        data-testid="entity-list-item"
        data-entity-id={entity.id}
      >
        <button
          type="button"
          draggable={!!onDragStart}
          ondragstart={(e) => onDragStart?.(e, entity.id)}
          ondragend={() => onDragEnd?.()}
          onclick={() => onSelect?.(entity)}
          title={`Select ${entity.title}`}
          class="flex flex-1 min-w-0 items-center gap-2 p-2.5 text-left focus:outline-none focus:ring-2 focus:ring-theme-accent/20 rounded-l-xl"
        >
          <span
            class="{getIconClass(
              cat?.icon,
            )} h-3.5 w-3.5 shrink-0 text-theme-muted transition-colors group-hover:text-theme-primary"
          ></span>
          <div class="flex-1 min-w-0">
            <div
              class="truncate font-header text-xs font-bold uppercase tracking-widest text-theme-text transition-colors group-hover:text-theme-primary"
            >
              {entity.title}
            </div>
          </div>
        </button>

        {#if entity.labels && entity.labels.length > 0}
          <div class="flex gap-1 shrink-0 px-2 flex-wrap justify-end">
            {#each entity.labels as label}
              <button
                type="button"
                onclick={(e) => {
                  e.stopPropagation();
                  uiStore.toggleLabelFilter(label, e.ctrlKey || e.metaKey);
                }}
                class="text-[7px] px-1 rounded uppercase tracking-[0.1em] truncate max-w-[60px] font-mono transition-all border {labelFilters.has(
                  label,
                )
                  ? 'bg-theme-primary text-theme-bg border-theme-primary'
                  : 'bg-theme-primary/10 text-theme-primary border-transparent hover:border-theme-primary/50 hover:bg-theme-primary/20'}"
              >
                {label}
              </button>
            {/each}
          </div>
        {/if}

        {#if onOpenZen}
          <button
            type="button"
            onclick={() => onOpenZen(entity)}
            title="Open in Zen Mode"
            aria-label="Open {entity.title} in Zen Mode"
            class="shrink-0 flex items-center justify-center px-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-theme-muted hover:text-theme-primary focus:outline-none focus:opacity-100 focus-visible:opacity-100 rounded-r-xl"
          >
            <span class="icon-[lucide--book-open] h-3.5 w-3.5"></span>
          </button>
        {/if}
      </div>
    {/snippet}

    {#snippet sectionHeader(title: string)}
      <div
        class="py-1 px-2 mt-4 first:mt-0 text-[10px] font-bold text-theme-muted uppercase tracking-[0.2em] border-b border-theme-border/30 mb-1"
      >
        {title}
      </div>
    {/snippet}

    {#if viewMode === "list"}
      {#each filteredEntities as entity (entity.id)}
        {@render entityItem(entity)}
      {:else}
        <div class="text-center py-10 px-4" data-testid="no-entities-found">
          <p class="text-xs text-theme-muted">No entities found</p>
        </div>
      {/each}
    {:else if viewMode === "label" && groupedEntities?.type === "label"}
      {#each groupedEntities.sortedKeys as label}
        {@const labelEntities = groupedEntities.groups.get(label) ?? []}
        {@const isCollapsed = collapsedLabelGroups.has(label)}
        <button
          type="button"
          onclick={() => uiStore.toggleExplorerLabelGroup(activeVaultId, label)}
          aria-expanded={!isCollapsed}
          class="mt-4 first:mt-0 flex w-full items-center justify-between rounded-lg border border-theme-border/30 px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-theme-muted transition-all hover:border-theme-primary/40 hover:bg-theme-primary/5 hover:text-theme-text focus:border-theme-accent focus:outline-none focus:ring-2 focus:ring-theme-accent/20"
        >
          <span class="flex items-center gap-1.5">
            {#if isCollapsed}
              <ChevronRight class="h-3 w-3" />
            {:else}
              <ChevronDown class="h-3 w-3" />
            {/if}
            <span>{label}</span>
          </span>
          <span class="text-[9px] text-theme-muted/80"
            >{labelEntities.length}</span
          >
        </button>
        {#if !isCollapsed}
          {#each labelEntities as entity (`${entity.id}:${label}`)}
            {@render entityItem(entity)}
          {/each}
        {/if}
      {/each}
      {#if groupedEntities.unlabeled && groupedEntities.unlabeled.length > 0}
        {@render sectionHeader("Unlabeled")}
        {#each groupedEntities.unlabeled as entity (entity.id)}
          {@render entityItem(entity)}
        {/each}
      {/if}
      {#if filteredEntities.length === 0}
        <div class="text-center py-10 px-4" data-testid="no-entities-found">
          <p class="text-xs text-theme-muted">No entities found</p>
        </div>
      {/if}
    {/if}
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
