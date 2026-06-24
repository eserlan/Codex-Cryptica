<script lang="ts">
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import {
    filterEntities,
    countEntityTypes,
  } from "$lib/components/explorer/entityListFiltering";
  import EntityTable from "$lib/components/table/EntityTable.svelte";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import {
    sortEntities,
    nextSortState,
    type SortKey,
    type SortState,
  } from "$lib/components/table/entityTableSort";

  // Peer view (like /map, /timeline): reads the already-active vault from the store.
  const vaultId = $derived(vault.activeVaultId);

  let searchQuery = $state("");
  let typeFilters = $state<Set<string>>(new Set());
  let sort = $state<SortState>({ key: "title", direction: "asc" });

  const totalEntities = $derived(vault.allEntities.length);

  const typeCounts = $derived(
    countEntityTypes(vault.allEntities, {
      allowedTypes: null,
      showDraftsOnly: false,
    }),
  );

  const filtered = $derived(
    filterEntities(vault.allEntities, {
      searchQuery,
      typeFilters,
      labelFilters: new Set<string>(),
      allowedTypes: null,
      showDraftsOnly: false,
    }),
  );

  const rows = $derived(sortEntities(filtered, sort));

  // ─── Row selection + bulk actions ───────────────────────────────────────
  let selectedIds = $state<Set<string>>(new Set());

  // Selection respects the current filtered set: clear it whenever the filters
  // change so we never act on rows the user can no longer see. (Sorting keeps
  // the same set, so it doesn't clear.)
  $effect(() => {
    void searchQuery;
    void typeFilters;
    selectedIds = new Set();
  });

  const selectedVisible = $derived(rows.filter((e) => selectedIds.has(e.id)));
  const allSelected = $derived(
    rows.length > 0 && rows.every((e) => selectedIds.has(e.id)),
  );
  const someSelected = $derived(selectedVisible.length > 0 && !allSelected);

  function toggleRow(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds = next;
  }

  function toggleAll() {
    if (allSelected) {
      selectedIds = new Set();
    } else {
      selectedIds = new Set(rows.map((e) => e.id));
    }
  }

  function clearSelection() {
    selectedIds = new Set();
  }

  function openBulkLabels() {
    if (selectedVisible.length === 0) return;
    modalUIStore.openBulkLabelDialog(selectedVisible.map((e) => e.id));
  }

  function handleSort(key: SortKey) {
    sort = nextSortState(sort, key);
  }

  function toggleType(type: string) {
    const next = new Set(typeFilters);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    typeFilters = next;
  }

  function clearFilters() {
    searchQuery = "";
    typeFilters = new Set();
  }

  const hasActiveFilters = $derived(
    searchQuery.trim().length > 0 || typeFilters.size > 0,
  );
</script>

<svelte:head>
  <title>Entity Table</title>
</svelte:head>

<div class="flex h-full flex-col gap-4 p-4 md:p-6">
  <header class="flex flex-col gap-1">
    <h1
      class="font-header text-lg font-bold uppercase tracking-wider text-theme-text"
    >
      Entity Table
    </h1>
    <p class="text-xs text-theme-muted">
      Browse, filter, and sort every entity in this vault.
    </p>
  </header>

  {#if !vault.isInitialized}
    <div
      class="flex flex-1 items-center justify-center text-sm text-theme-muted"
      data-testid="entity-table-loading"
    >
      <span class="icon-[lucide--loader-circle] mr-2 h-4 w-4 animate-spin"
      ></span>
      Loading vault…
    </div>
  {:else if !vaultId}
    <EmptyState
      icon="icon-[lucide--table]"
      headline="No vault open"
      body="Open a vault to browse its entities in table view."
    />
  {:else if totalEntities === 0}
    <EmptyState
      icon="icon-[lucide--table]"
      headline="No entities yet"
      body="Create entities in this vault and they'll show up here as rows."
    />
  {:else}
    <!-- Controls -->
    <div class="flex flex-col gap-3">
      <div class="relative max-w-md">
        <span
          class="icon-[lucide--search] pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted"
          aria-hidden="true"
        ></span>
        <input
          type="search"
          bind:value={searchQuery}
          placeholder="Search by name, content, or #label…"
          aria-label="Search entities"
          data-testid="entity-table-search"
          class="w-full rounded-lg border border-theme-border bg-theme-surface py-2 pl-9 pr-3 text-sm text-theme-text placeholder:text-theme-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
        />
      </div>

      {#if typeCounts.size > 0}
        <div class="flex flex-wrap items-center gap-1.5">
          {#each [...typeCounts.entries()].sort( (a, b) => a[0].localeCompare(b[0]), ) as [type, count] (type)}
            {@const cat = categories.getCategory(type)}
            {@const active = typeFilters.has(type)}
            <button
              type="button"
              onclick={() => toggleType(type)}
              aria-pressed={active}
              data-testid="entity-table-type-filter"
              class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {active
                ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
                : 'border-theme-border text-theme-muted hover:border-theme-primary/50'}"
            >
              {#if cat}
                <span
                  class="{getIconClass(cat.icon)} h-3.5 w-3.5"
                  aria-hidden="true"
                ></span>
              {/if}
              {cat?.label ?? type}
              <span class="text-theme-muted/60">{count}</span>
            </button>
          {/each}
          {#if hasActiveFilters}
            <button
              type="button"
              onclick={clearFilters}
              class="ml-1 rounded text-xs text-theme-muted underline hover:text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
            >
              Clear
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Results -->
    <div class="min-h-0 flex-1 overflow-auto">
      {#if rows.length === 0}
        <EmptyState
          icon="icon-[lucide--search-x]"
          headline="No matching entities"
          body="Try a different search or clear your filters."
          cta="Clear filters"
          onCta={clearFilters}
        />
      {:else}
        {#if selectedVisible.length > 0}
          <div
            class="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-theme-primary/40 bg-theme-primary/10 px-3 py-2"
            data-testid="entity-table-selection-toolbar"
          >
            <span
              class="text-xs font-semibold text-theme-text"
              data-testid="entity-table-selection-count"
            >
              {selectedVisible.length} selected
            </span>
            <button
              type="button"
              onclick={openBulkLabels}
              data-testid="entity-table-bulk-label"
              class="inline-flex items-center gap-1.5 rounded-md border border-theme-primary/50 bg-theme-surface px-2.5 py-1 text-xs font-medium text-theme-primary transition-colors hover:bg-theme-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
            >
              <span class="icon-[lucide--tags] h-3.5 w-3.5" aria-hidden="true"
              ></span>
              Add / remove labels
            </button>
            <button
              type="button"
              onclick={clearSelection}
              data-testid="entity-table-selection-clear"
              class="ml-auto rounded text-xs text-theme-muted underline hover:text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
            >
              Clear selection
            </button>
          </div>
        {:else}
          <p
            class="mb-2 text-xs text-theme-muted"
            data-testid="entity-table-count"
          >
            {rows.length}
            {rows.length === 1 ? "entity" : "entities"}
          </p>
        {/if}
        <EntityTable
          entities={rows}
          {vaultId}
          {sort}
          onSort={handleSort}
          {selectedIds}
          {allSelected}
          {someSelected}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
        />
      {/if}
    </div>
  {/if}
</div>
