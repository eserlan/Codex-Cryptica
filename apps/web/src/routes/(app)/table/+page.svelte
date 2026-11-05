<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import { categories } from "#lib/stores/categories.svelte.js";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
  import { guestVault } from "#lib/stores/guest-vault.svelte.js";
  import {
    filterEntities,
    countEntityTypes,
  } from "#lib/components/explorer/entityListFiltering.js";
  import { EntityContentSearch } from "#lib/components/explorer/entity-content-search.svelte.js";
  import { searchService } from "@codex/search-orchestrator";
  import EntityTable from "#lib/components/table/EntityTable.svelte";
  import TableContextMenu from "#lib/components/table/TableContextMenu.svelte";
  import { computeVaultAuditCounts } from "#lib/components/table/vaultAudit.js";
  import { computeVaultDistribution } from "#lib/components/table/vaultDistribution.js";
  import { sortEntities } from "#lib/components/table/entityTableSort.js";
  import EmptyState from "#lib/components/ui/EmptyState.svelte";
  import {
    computeConnectionCounts,
    countIncompleteEntities,
  } from "./table-data.js";
  import { TableFilters } from "./table-filters.svelte.js";
  import { TableSelection } from "./table-selection.svelte.js";
  import { TablePerformance } from "./table-performance.js";
  import TableControls from "./TableControls.svelte";
  import TableSelectionToolbar from "./TableSelectionToolbar.svelte";

  // Peer view (like /map, /timeline): reads the already-active vault from the store.
  const vaultId = $derived(vault.activeVaultId);
  const totalEntities = $derived(vault.allEntities.length);
  const performance: TablePerformance = new TablePerformance(() => ({
    entityCount: totalEntities,
    resultCount: rows.length,
  }));
  const filters = new TableFilters(performance.measure);
  const contentSearch = new EntityContentSearch(() => searchService);
  contentSearch.connect(
    () => filters.searchQuery,
    () => totalEntities,
  );

  const connectionCounts = $derived(
    computeConnectionCounts(vault.allEntities, vault.inboundConnections ?? {}),
  );
  const incompleteCount = $derived(
    countIncompleteEntities(vault.allEntities, connectionCounts),
  );
  const auditCounts = $derived(
    computeVaultAuditCounts(vault.allEntities, connectionCounts),
  );
  const typeCounts = $derived(
    countEntityTypes(vault.allEntities, {
      allowedTypes: null,
      showDraftsOnly: false,
    }),
  );
  const filtered = $derived(
    filterEntities(vault.allEntities, {
      searchQuery: filters.searchQuery,
      typeFilters: filters.typeFilters,
      labelFilters: filters.labelFilters,
      allowedTypes: null,
      showDraftsOnly: false,
      textMatchIds: contentSearch.textMatchIds,
      textSearchPending: contentSearch.textSearchPending,
      textSearchUnavailable: contentSearch.textSearchUnavailable,
      showIncompleteOnly: filters.showIncompleteOnly,
      columnFilters: filters.columnFilters,
      connectionCounts,
    }),
  );
  const distributionSummary = $derived(
    computeVaultDistribution(vault.allEntities, filtered, categories.list),
  );

  const rows = $derived(sortEntities(filtered, filters.sort, connectionCounts));
  const selection = new TableSelection(() => rows);
  const graphHref = $derived(
    sessionModeStore.isGuestMode && guestVault.publishId
      ? resolve("/(app)/guest/[publishId]", { publishId: guestVault.publishId })
      : resolve("/(app)"),
  );

  $effect(() =>
    filters.syncAuditMode(
      page.url.searchParams.get("mode"),
      page.url.searchParams.get("audit"),
    ),
  );
  $effect(() => {
    if (vault.isInitialized && vaultId) performance.recordOpen();
  });
  // Filtering resets selection; sorting retains the same selected ids.
  $effect(() => {
    void filters.searchQuery;
    void filters.typeFilters;
    void filters.labelFilters;
    void filters.showIncompleteOnly;
    void filters.columnFilters;
    selection.reset();
  });
</script>

<svelte:head><title>Entity Table</title></svelte:head>
<svelte:window onkeydown={selection.handleKeyDown} />

<div
  class="flex h-full flex-col gap-3 md:gap-4 bg-theme-bg p-3 sm:p-4 md:p-6"
  style:background-image="var(--bg-texture-overlay)"
>
  <header class="flex items-start justify-between gap-3">
    <div class="flex flex-col gap-0.5 md:gap-1">
      <h1
        class="font-header text-base md:text-lg font-bold uppercase tracking-wider text-theme-text"
      >
        Entity Table
      </h1>
      <p class="text-xs text-theme-muted hidden sm:block">
        Browse, filter, and sort every entity in this vault.
      </p>
    </div>

    <a
      href={graphHref}
      class="flex h-8 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded border border-theme-border bg-theme-surface/80 px-2 text-micro font-bold uppercase tracking-tighter text-theme-muted transition hover:border-theme-primary hover:text-theme-primary"
      data-testid="table-browse-as-graph"
      title="Browse the same entities as a knowledge graph"
    >
      <span aria-hidden="true" class="icon-[lucide--network] h-4 w-4"></span>
      View as graph
    </a>
  </header>

  {#if !vault.isInitialized}
    <div
      class="flex flex-1 items-center justify-center text-sm text-theme-muted"
      data-testid="entity-table-loading"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--loader-circle] mr-2 h-4 w-4 animate-spin"
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
    <TableControls
      {filters}
      {vaultId}
      {typeCounts}
      {incompleteCount}
      {auditCounts}
      {distributionSummary}
      searchStatusMessage={contentSearch.statusMessage}
    />

    <!-- Results -->
    <div class="min-h-0 flex-1 overflow-auto">
      {#if rows.length === 0}
        <EmptyState
          icon="icon-[lucide--search-x]"
          headline="No matching entities"
          body="Try a different search or clear your filters."
          cta="Clear filters"
          onCta={filters.clearFilters}
        />
      {:else}
        <TableSelectionToolbar
          selectedCount={selection.selectedVisible.length}
          resultCount={rows.length}
          isGuest={vault.isGuest}
          onLabels={selection.openBulkLabels}
          onReport={selection.openBulkReport}
          onClear={selection.clearSelection}
        />
        <EntityTable
          entities={rows}
          {vaultId}
          sort={filters.sort}
          {connectionCounts}
          showIncompleteOnly={filters.showIncompleteOnly}
          columnFilters={filters.columnFilters}
          activeLabels={filters.labelFilters}
          onUpdateColumnFilters={filters.handleUpdateColumnFilters}
          onSort={filters.handleSort}
          selectedIds={selection.selectedIds}
          allSelected={selection.allSelected}
          someSelected={selection.someSelected}
          onToggleRow={selection.toggleRow}
          onToggleAll={selection.toggleAll}
          onFilterType={filters.toggleType}
          onFilterLabel={filters.toggleLabel}
          onRowContextMenu={selection.handleRowContextMenu}
        />
      {/if}
    </div>
  {/if}
</div>

{#if selection.contextMenu}
  <TableContextMenu
    x={selection.contextMenu.x}
    y={selection.contextMenu.y}
    selectedIds={selection.contextMenu.targetIds}
    onManageLabels={selection.handleManageLabels}
    onChangeType={selection.handleChangeType}
    onDelete={selection.handleDeleteSelected}
    onClose={selection.closeContextMenu}
  />
{/if}
