<script lang="ts">
  import { tick } from "svelte";
  import { base } from "$app/paths";
  import { vault } from "$lib/stores/vault.svelte";
  import { categories } from "$lib/stores/categories.svelte";
  import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
  import { guestVault } from "$lib/stores/guest-vault.svelte";
  import { getIconClass } from "$lib/utils/icon";
  import {
    filterEntities,
    countEntityTypes,
    createEntityTextSearchRunner,
    parseEntitySearchQuery,
    evaluateEntityMissingFields,
    type TableColumnFilters,
  } from "$lib/components/explorer/entityListFiltering";
  import { searchService } from "@codex/search-orchestrator";
  import type { SearchIndexProgress } from "@codex/search-engine";
  import EntityTable from "$lib/components/table/EntityTable.svelte";
  import EntityTableSearch from "$lib/components/table/EntityTableSearch.svelte";
  import TableContextMenu from "$lib/components/table/TableContextMenu.svelte";
  import TableViewPresets from "$lib/components/table/TableViewPresets.svelte";
  import type { ViewPreset } from "$lib/stores/view-presets";
  import EmptyState from "$lib/components/ui/EmptyState.svelte";
  import {
    sortEntities,
    nextSortState,
    type SortKey,
    type SortState,
    type ConnectionSummary,
  } from "$lib/components/table/entityTableSort";
  import { browserPerformanceRecorder } from "$lib/services/performance/browser-performance-capture";
  import type {
    PerformanceOperation,
    PerformanceOperationHandle,
  } from "@codex/performance-observability";

  // Peer view (like /map, /timeline): reads the already-active vault from the store.
  const vaultId = $derived(vault.activeVaultId);

  let searchQuery = $state("");
  let typeFilters = $state<Set<string>>(new Set());
  let labelFilters = $state<Set<string>>(new Set());
  let showIncompleteOnly = $state(false);
  let columnFilters = $state<TableColumnFilters>({});
  let textMatchIds = $state<Set<string> | null>(null);
  let textSearchPending = $state(false);
  let textSearchUnavailable = $state(false);
  let textSearchError = $state<string | null>(null);
  let indexProgress = $state<SearchIndexProgress>(
    searchService.getIndexProgress(),
  );
  let latestIndexStatus = searchService.getIndexProgress().status;
  let indexStatusVersion = $state(0);
  const parsedSearchQuery = $derived(parseEntitySearchQuery(searchQuery));
  let sort = $state<SortState>({ key: "title", direction: "asc" });
  let tableOpenRecorded = false;
  const tableOpenSpan = browserPerformanceRecorder.start("table_open");

  const totalEntities = $derived(vault.allEntities.length);

  const graphHref = $derived(
    sessionModeStore.isGuestMode && guestVault.publishId
      ? `${base}/guest/${guestVault.publishId}`
      : `${base}/`,
  );

  $effect(() => {
    const unsubscribe = searchService.subscribeIndexProgress((progress) => {
      if (progress.status !== latestIndexStatus) {
        latestIndexStatus = progress.status;
        indexStatusVersion += 1;
      }
      indexProgress = progress;
    });
    return unsubscribe;
  });

  $effect(() => {
    const query = searchQuery;
    const entityCount = vault.allEntities.length;
    void indexStatusVersion;
    const indexStatus = latestIndexStatus;
    const { textQuery } = parsedSearchQuery;
    if (!textQuery) {
      textMatchIds = null;
      textSearchPending = false;
      textSearchUnavailable = false;
      textSearchError = null;
      return;
    }

    if (indexStatus === "idle") {
      textMatchIds = null;
      textSearchPending = false;
      textSearchUnavailable = true;
      textSearchError = null;
      return;
    }

    textMatchIds = null;
    textSearchPending = true;
    textSearchUnavailable = false;
    textSearchError = null;
    const searchRunner = createEntityTextSearchRunner(searchService);
    void searchRunner.search(query, entityCount).then((result) => {
      if (!result) return;
      textSearchPending = false;
      textMatchIds = result.error ? null : result.matchIds;
      textSearchUnavailable = result.error !== null;
      textSearchError = result.error?.message ?? null;
    });

    return () => {
      searchRunner.cancel();
    };
  });

  const connectionCounts = $derived.by(() => {
    const inboundConnections = vault.inboundConnections ?? {};

    // ⚡ Bolt Optimization: Replace Object.fromEntries(vault.allEntities.map(...)) with an imperative loop.
    // Also replaces entity.connections?.filter(...).length with an imperative loop
    // to prevent intermediate array allocations and reduce GC overhead during reactive updates.
    const result: Record<string, ConnectionSummary> = {};
    const entities = vault.allEntities;
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const inbound = inboundConnections[entity.id]?.length ?? 0;

      let outbound = 0;
      if (entity.connections) {
        const connLen = entity.connections.length;
        for (let j = 0; j < connLen; j++) {
          if (entity.connections[j].target) {
            outbound++;
          }
        }
      }

      result[entity.id] = { inbound, outbound, total: inbound + outbound };
    }

    return result;
  });

  const incompleteCount = $derived.by(() => {
    let count = 0;
    const entities = vault.allEntities;
    for (let i = 0; i < entities.length; i++) {
      if (
        evaluateEntityMissingFields(
          entities[i],
          connectionCounts[entities[i].id],
        ).isIncomplete
      ) {
        count++;
      }
    }
    return count;
  });

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
      labelFilters,
      allowedTypes: null,
      showDraftsOnly: false,
      textMatchIds,
      textSearchPending,
      textSearchUnavailable,
      showIncompleteOnly,
      columnFilters,
      connectionCounts,
    }),
  );

  const searchStatusMessage = $derived(
    textSearchPending
      ? "Searching indexed content…"
      : textSearchError
        ? "Content search is temporarily unavailable; matching titles, aliases, and labels."
        : indexProgress.isPartial && parsedSearchQuery.textQuery
          ? "Search is still indexing; results will update as indexing finishes."
          : null,
  );

  const rows = $derived(sortEntities(filtered, sort, connectionCounts));

  async function completeAfterRender(span: PerformanceOperationHandle) {
    await tick();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    span.complete(() => ({
      entityCount: totalEntities,
      resultCount: rows.length,
      domNodeCount: document.querySelectorAll("[data-testid=entity-table-row]")
        .length,
    }));
  }

  function measureTableOperation(
    operation: PerformanceOperation,
    update: () => void,
  ) {
    const span = browserPerformanceRecorder.start(operation);
    update();
    void completeAfterRender(span);
  }

  $effect(() => {
    if (!tableOpenRecorded && vault.isInitialized && vaultId) {
      tableOpenRecorded = true;
      void completeAfterRender(tableOpenSpan);
    }
  });

  // ─── Row selection + bulk actions ───────────────────────────────────────
  let selectedIds = $state<Set<string>>(new Set());
  let lastSelectedId = $state<string | null>(null);
  let contextMenu = $state<{
    x: number;
    y: number;
    targetIds: string[];
  } | null>(null);
  let isCommitting = $state(false);

  // Selection respects the current filtered set: clear it whenever the filters
  // change so we never act on rows the user can no longer see. (Sorting keeps
  // the same set, so it doesn't clear.)
  $effect(() => {
    void searchQuery;
    void typeFilters;
    void labelFilters;
    void showIncompleteOnly;
    void columnFilters;
    selectedIds = new Set();
    lastSelectedId = null;
    contextMenu = null;
  });

  const selectedVisible = $derived(rows.filter((e) => selectedIds.has(e.id)));
  const allSelected = $derived(
    rows.length > 0 && rows.every((e) => selectedIds.has(e.id)),
  );
  const someSelected = $derived(selectedVisible.length > 0 && !allSelected);

  function toggleRow(
    id: string,
    options?: { shift?: boolean; ctrl?: boolean },
  ) {
    const next = new Set(selectedIds);
    const isSelected = next.has(id);

    if (options?.shift && lastSelectedId && lastSelectedId !== id) {
      const currentIndex = rows.findIndex((e) => e.id === id);
      const anchorIndex = rows.findIndex((e) => e.id === lastSelectedId);

      if (currentIndex !== -1 && anchorIndex !== -1) {
        const start = Math.min(currentIndex, anchorIndex);
        const end = Math.max(currentIndex, anchorIndex);
        const shouldSelect = selectedIds.has(lastSelectedId);

        for (let i = start; i <= end; i++) {
          const rowId = rows[i].id;
          if (shouldSelect) {
            next.add(rowId);
          } else {
            next.delete(rowId);
          }
        }
      }
    } else {
      if (isSelected) {
        next.delete(id);
        if (lastSelectedId === id) lastSelectedId = null;
      } else {
        next.add(id);
        lastSelectedId = id;
      }
    }
    selectedIds = next;
  }

  function toggleAll() {
    if (allSelected) {
      selectedIds = new Set();
      lastSelectedId = null;
    } else {
      selectedIds = new Set(rows.map((e) => e.id));
      lastSelectedId = rows.length > 0 ? rows[0].id : null;
    }
  }

  function clearSelection() {
    selectedIds = new Set();
    lastSelectedId = null;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      if (contextMenu) {
        contextMenu = null;
      } else {
        clearSelection();
      }
    }
  }

  function handleRowContextMenu(id: string, x: number, y: number) {
    const next = new Set(selectedIds);
    if (!next.has(id)) {
      next.clear();
      next.add(id);
      lastSelectedId = id;
      selectedIds = next;
    }
    contextMenu = {
      x,
      y,
      targetIds: Array.from(selectedIds),
    };
  }

  function handleManageLabels() {
    if (!contextMenu) return;
    modalUIStore.openBulkLabelDialog(contextMenu.targetIds);
  }

  async function handleChangeType(type: string) {
    if (isCommitting) return;
    if (!contextMenu || contextMenu.targetIds.length === 0) return;
    const targetIds = contextMenu.targetIds;

    const confirmed = await notificationStore.confirm({
      title: "Change Entity Type",
      message: `Are you sure you want to change the type of ${
        targetIds.length > 1 ? `${targetIds.length} entities` : "this entity"
      } to "${type}"? This may result in some type-specific metadata layout updates.`,
      confirmLabel: "Change type",
      cancelLabel: "Cancel",
      isDangerous: false,
    });

    if (confirmed) {
      isCommitting = true;
      try {
        const result = await vault.bulkUpdate(
          Object.fromEntries(targetIds.map((id) => [id, { type }])),
        );
        if (result.failedIds.length > 0 || result.skippedIds.length > 0) {
          notificationStore.notify(
            `Changed ${result.succeededIds.length} entities; ${
              result.failedIds.length + result.skippedIds.length
            } could not be changed.`,
            "error",
          );
        }
      } catch (err: any) {
        console.error("Failed to change type", err);
        notificationStore.notify(`Error: ${err.message}`, "error");
      } finally {
        isCommitting = false;
      }
    }
  }

  async function handleDeleteSelected() {
    if (isCommitting) return;
    if (!contextMenu || contextMenu.targetIds.length === 0) return;
    const targetIds = contextMenu.targetIds;

    const confirmed = await notificationStore.confirm({
      title:
        targetIds.length > 1 ? "Delete Selected Entities" : "Delete Entity",
      message: `Are you sure you want to permanently delete ${
        targetIds.length > 1
          ? `these ${targetIds.length} entities`
          : "this entity"
      }? This action cannot be undone.`,
      confirmLabel: "Delete permanently",
      cancelLabel: "Cancel",
      isDangerous: true,
    });

    if (confirmed) {
      isCommitting = true;
      try {
        const result = await vault.bulkDelete(targetIds);
        const succeededIds = new Set(result.succeededIds);
        selectedIds = new Set(
          [...selectedIds].filter((id) => !succeededIds.has(id)),
        );
        if (result.failedIds.length > 0 || result.cancelledIds.length > 0) {
          notificationStore.notify(
            `Deleted ${result.succeededIds.length} entities; ${
              result.failedIds.length + result.cancelledIds.length
            } remain selected for retry.`,
            "error",
          );
        } else {
          clearSelection();
        }
      } catch (err: any) {
        console.error("Failed to delete", err);
        notificationStore.notify(`Error: ${err.message}`, "error");
      } finally {
        isCommitting = false;
      }
    }
  }

  function openBulkLabels() {
    if (selectedVisible.length === 0) return;
    modalUIStore.openBulkLabelDialog(selectedVisible.map((e) => e.id));
  }

  function handleSort(key: SortKey) {
    measureTableOperation("table_sort", () => {
      sort = nextSortState(sort, key);
    });
  }

  function toggleType(type: string) {
    measureTableOperation("table_filter", () => {
      const next = new Set(typeFilters);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      typeFilters = next;
    });
  }

  function toggleLabel(label: string) {
    measureTableOperation("table_filter", () => {
      const next = new Set(labelFilters);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      labelFilters = next;
    });
  }

  function toggleIncompleteOnly() {
    measureTableOperation("table_filter", () => {
      showIncompleteOnly = !showIncompleteOnly;
    });
  }

  function handleUpdateColumnFilters(newFilters: TableColumnFilters) {
    measureTableOperation("table_filter", () => {
      columnFilters = newFilters;
    });
  }

  function clearFilters() {
    measureTableOperation("table_filter", () => {
      searchQuery = "";
      typeFilters = new Set();
      labelFilters = new Set();
      showIncompleteOnly = false;
      columnFilters = {};
    });
  }

  function setSearchQuery(value: string) {
    measureTableOperation("table_filter", () => {
      searchQuery = value;
    });
  }

  let showMobileFilters = $state(false);

  const hasActiveColumnFilters = $derived(
    Boolean(
      columnFilters.nameQuery ||
      (columnFilters.typeValues && columnFilters.typeValues.size > 0) ||
      (columnFilters.labelMode && columnFilters.labelMode !== "all") ||
      (columnFilters.labelValues && columnFilters.labelValues.size > 0) ||
      (columnFilters.connectionsMode &&
        columnFilters.connectionsMode !== "all") ||
      (columnFilters.summaryMode && columnFilters.summaryMode !== "all") ||
      (columnFilters.createdMode && columnFilters.createdMode !== "all") ||
      (columnFilters.modifiedMode && columnFilters.modifiedMode !== "all"),
    ),
  );

  const activeFilterCount = $derived(
    typeFilters.size +
      labelFilters.size +
      (showIncompleteOnly ? 1 : 0) +
      (hasActiveColumnFilters ? 1 : 0),
  );

  const hasActiveFilters = $derived(
    searchQuery.trim().length > 0 ||
      typeFilters.size > 0 ||
      labelFilters.size > 0 ||
      showIncompleteOnly ||
      hasActiveColumnFilters,
  );

  function handleApplyPreset(preset: ViewPreset) {
    const s = preset.state;
    searchQuery = s.searchQuery ?? "";
    typeFilters = new Set(s.activeCategories);
    labelFilters = new Set(s.activeLabels);
    showIncompleteOnly = s.showIncompleteOnly ?? false;
    columnFilters = s.columnFilters ? { ...s.columnFilters } : {};
    if (s.tableSort) {
      sort = { ...s.tableSort };
    }
  }

  function handleResetFilters() {
    searchQuery = "";
    typeFilters = new Set();
    labelFilters = new Set();
    showIncompleteOnly = false;
    columnFilters = {};
    sort = { key: "title", direction: "asc" };
  }

  const hasFilterPanel = $derived(
    typeCounts.size > 0 || labelFilters.size > 0 || hasActiveFilters,
  );
</script>

<svelte:head>
  <title>Entity Table</title>
</svelte:head>

<svelte:window onkeydown={handleKeyDown} />

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
      class="flex h-8 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded border border-theme-border bg-theme-surface/80 px-2 text-[10px] font-bold uppercase tracking-tighter text-theme-muted transition hover:border-theme-primary hover:text-theme-primary"
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
    <div class="flex flex-col gap-2.5 md:gap-3">
      <div class="flex items-center gap-2 md:gap-3">
        <EntityTableSearch
          bind:searchQuery
          bind:labelFilters
          onSearchChange={setSearchQuery}
        />

        <!-- Mobile filters toggle button -->
        <button
          type="button"
          onclick={() => (showMobileFilters = !showMobileFilters)}
          aria-expanded={showMobileFilters}
          aria-controls={hasFilterPanel
            ? "entity-table-filter-panel"
            : undefined}
          data-testid="entity-table-mobile-filters-toggle"
          class="inline-flex md:hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 shrink-0 {showMobileFilters ||
          activeFilterCount > 0
            ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
            : 'border-theme-border bg-theme-surface text-theme-muted hover:text-theme-text'}"
        >
          <span class="icon-[lucide--filter] h-3.5 w-3.5" aria-hidden="true"
          ></span>
          <span>Filters</span>
          {#if activeFilterCount > 0}
            <span
              class="rounded-full bg-theme-primary px-1.5 py-0.2 text-[10px] font-bold text-theme-bg"
              data-testid="entity-table-active-filter-badge"
            >
              {activeFilterCount}
            </span>
          {/if}
        </button>

        <!-- Desktop Incomplete only toggle -->
        <button
          type="button"
          onclick={toggleIncompleteOnly}
          aria-pressed={showIncompleteOnly}
          data-testid="entity-table-incomplete-filter"
          class="hidden md:inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {showIncompleteOnly
            ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
            : 'border-theme-border bg-theme-surface text-theme-muted hover:border-amber-500/50 hover:text-theme-text'}"
        >
          <span
            class="icon-[lucide--alert-circle] h-3.5 w-3.5"
            aria-hidden="true"
          ></span>
          Incomplete only
          <span
            class="rounded-full px-1.5 py-0.2 text-[10px] {showIncompleteOnly
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold'
              : 'bg-theme-border text-theme-muted'}"
          >
            {incompleteCount}
          </span>
        </button>

        <TableViewPresets
          activeVaultId={vaultId}
          currentFilterState={{
            searchQuery,
            typeFilters,
            labelFilters,
            showIncompleteOnly,
            columnFilters,
            sort,
          }}
          onApplyPreset={handleApplyPreset}
          onResetFilters={handleResetFilters}
        />
      </div>

      {#if searchStatusMessage}
        <p class="text-[10px] text-theme-muted" aria-live="polite">
          {searchStatusMessage}
        </p>
      {/if}

      {#if hasFilterPanel}
        <div
          id="entity-table-filter-panel"
          class="{showMobileFilters
            ? 'flex'
            : 'hidden'} md:flex flex-wrap items-center gap-1.5"
        >
          <!-- Mobile Incomplete filter chip in expanded drawer -->
          <button
            type="button"
            onclick={toggleIncompleteOnly}
            aria-pressed={showIncompleteOnly}
            data-testid="entity-table-incomplete-filter-mobile"
            class="inline-flex md:hidden items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {showIncompleteOnly
              ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'border-theme-border text-theme-muted hover:border-amber-500/50'}"
          >
            <span
              class="icon-[lucide--alert-circle] h-3.5 w-3.5"
              aria-hidden="true"
            ></span>
            Incomplete
            <span class="text-theme-muted/60">{incompleteCount}</span>
          </button>

          {#each [...typeCounts.entries()].sort( (a, b) => (a[0] ?? "").localeCompare(b[0] ?? "") ) as [type, count] (type)}
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
          {#each [...labelFilters].sort() as label (label)}
            <div
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-theme-primary/10 border border-theme-primary/20 text-[9px] font-bold text-theme-primary uppercase tracking-wider"
              data-testid="entity-table-label-filter"
            >
              <span>{label}</span>
              <button
                type="button"
                onclick={() => toggleLabel(label)}
                title="Remove {label} filter"
                aria-label="Remove {label} filter"
                class="hover:text-theme-text transition-colors flex items-center justify-center cursor-pointer"
              >
                <span aria-hidden="true" class="icon-[lucide--x] w-2.5 h-2.5"
                ></span>
              </button>
            </div>
          {/each}
          {#if hasActiveFilters}
            <button
              type="button"
              onclick={clearFilters}
              data-testid="entity-table-clear-filters"
              class="ml-1 rounded text-xs text-theme-muted underline hover:text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
            >
              Clear all filters
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
          {connectionCounts}
          {showIncompleteOnly}
          {columnFilters}
          onUpdateColumnFilters={handleUpdateColumnFilters}
          onSort={handleSort}
          {selectedIds}
          {allSelected}
          {someSelected}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          onFilterType={toggleType}
          onFilterLabel={toggleLabel}
          onRowContextMenu={handleRowContextMenu}
        />
      {/if}
    </div>
  {/if}
</div>

{#if contextMenu}
  <TableContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    selectedIds={contextMenu.targetIds}
    onManageLabels={handleManageLabels}
    onChangeType={handleChangeType}
    onDelete={handleDeleteSelected}
    onClose={() => {
      contextMenu = null;
    }}
  />
{/if}
