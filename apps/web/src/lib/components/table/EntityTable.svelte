<script lang="ts">
  import type { Entity } from "schema";
  import type {
    ConnectionSummary,
    SortKey,
    SortState,
  } from "./entityTableSort";
  import type { TableColumnFilters } from "$lib/components/explorer/entityListFiltering";
  import EntityTableRow from "./EntityTableRow.svelte";
  import TableColumnFilterMenu from "./TableColumnFilterMenu.svelte";
  import {
    clampEntityTablePage,
    ENTITY_TABLE_PAGE_SIZE,
    getEntityTablePageCount,
    getEntityTablePageItems,
  } from "./entityTablePagination";

  let {
    entities,
    vaultId,
    sort,
    connectionCounts = {},
    onSort,
    selectedIds = new Set<string>(),
    allSelected = false,
    someSelected = false,
    showIncompleteOnly = false,
    columnFilters = {},
    onUpdateColumnFilters,
    onToggleRow,
    onToggleAll,
    onFilterType,
    onFilterLabel,
    onRowContextMenu,
  }: {
    entities: Entity[];
    vaultId: string;
    sort: SortState;
    connectionCounts?: Record<string, ConnectionSummary>;
    onSort: (key: SortKey) => void;
    selectedIds?: Set<string>;
    allSelected?: boolean;
    someSelected?: boolean;
    showIncompleteOnly?: boolean;
    columnFilters?: TableColumnFilters;
    onUpdateColumnFilters?: (filters: TableColumnFilters) => void;
    onToggleRow?: (
      id: string,
      options?: { shift?: boolean; ctrl?: boolean },
    ) => void;
    onToggleAll?: () => void;
    onFilterType?: (type: string) => void;
    onFilterLabel?: (label: string) => void;
    onRowContextMenu?: (id: string, x: number, y: number) => void;
  } = $props();

  let activeFilterMenu = $state<{
    key: string;
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const pageSize = ENTITY_TABLE_PAGE_SIZE;
  let page = $state(1);
  let previousEntities: Entity[] | null = null;
  let restoredStorageKey: string | null = null;

  const pageCount = $derived(
    getEntityTablePageCount(entities.length, pageSize),
  );
  const pageItems = $derived(getEntityTablePageItems(entities, page, pageSize));
  const firstItem = $derived(
    entities.length === 0 ? 0 : (page - 1) * pageSize + 1,
  );
  const lastItem = $derived(Math.min(page * pageSize, entities.length));

  // Filtering and sorting replace the input array. Return to the first page
  // for those operations, while clamping when entities disappear in-place.
  $effect(() => {
    if (previousEntities !== entities) {
      previousEntities = entities;
      page = 1;
    }
    page = clampEntityTablePage(page, entities.length, pageSize);
  });

  function goToPage(nextPage: number) {
    page = clampEntityTablePage(nextPage, entities.length, pageSize);
  }

  function readStoredPage(storageKey: string): number | null {
    if (typeof sessionStorage === "undefined") return null;
    try {
      const storedPage = Number(sessionStorage.getItem(storageKey));
      return Number.isFinite(storedPage) && storedPage > 0 ? storedPage : null;
    } catch {
      return null;
    }
  }

  function writeStoredPage(storageKey: string, value: number) {
    if (typeof sessionStorage === "undefined") return;
    try {
      sessionStorage.setItem(storageKey, String(value));
    } catch {
      // Storage can be blocked or full; pagination remains usable in memory.
    }
  }

  // Keep the current page for browser-back navigation from an entity detail.
  // sessionStorage is transient, tab-local, and guarded for SSR.
  $effect(() => {
    const currentPage = page;
    const storageKey = `codex.entity-table.page.${vaultId}`;
    if (restoredStorageKey !== storageKey) {
      restoredStorageKey = storageKey;
      const storedPage = readStoredPage(storageKey);
      if (storedPage !== null) {
        page = clampEntityTablePage(storedPage, entities.length, pageSize);
      }
      return;
    }
    writeStoredPage(storageKey, currentPage);
  });

  // <input indeterminate> can't be set via attribute — bind the element.
  let selectAllEl = $state<HTMLInputElement | null>(null);
  $effect(() => {
    if (selectAllEl) selectAllEl.indeterminate = someSelected;
  });

  interface Column {
    id: string;
    key: SortKey | null;
    label: string;
    filterable?: boolean;
    /** Tailwind width / layout hints for the header cell. */
    class?: string;
  }

  const columns: Column[] = [
    { id: "title", key: "title", label: "Name", class: "min-w-[12rem]" },
    { id: "type", key: "type", label: "Type", class: "min-w-[8rem]" },
    {
      id: "connections",
      key: "connections",
      label: "Connections",
      filterable: true,
      class: "min-w-[9rem]",
    },
    {
      id: "summary",
      key: null,
      label: "Summary",
      filterable: true,
      class: "min-w-[16rem]",
    },
    {
      id: "labels",
      key: "labels",
      label: "Labels",
      filterable: true,
      class: "min-w-[8rem]",
    },
    {
      id: "created",
      key: "created",
      label: "Created",
      filterable: true,
      class: "min-w-[7rem]",
    },
    {
      id: "modified",
      key: "modified",
      label: "Modified",
      filterable: true,
      class: "min-w-[7rem]",
    },
  ];

  function ariaSort(key: SortKey | null): "ascending" | "descending" | "none" {
    if (key === null || sort.key !== key) return "none";
    return sort.direction === "asc" ? "ascending" : "descending";
  }

  function isColumnFiltered(id: string): boolean {
    if (id === "connections")
      return Boolean(
        columnFilters.connectionsMode &&
        columnFilters.connectionsMode !== "all",
      );
    if (id === "summary")
      return Boolean(
        columnFilters.summaryMode && columnFilters.summaryMode !== "all",
      );
    if (id === "labels")
      return Boolean(
        (columnFilters.labelMode && columnFilters.labelMode !== "all") ||
        (columnFilters.labelValues && columnFilters.labelValues.size > 0),
      );
    if (id === "created")
      return Boolean(
        columnFilters.createdMode && columnFilters.createdMode !== "all",
      );
    if (id === "modified")
      return Boolean(
        columnFilters.modifiedMode && columnFilters.modifiedMode !== "all",
      );
    return false;
  }

  function openFilterMenu(col: Column, event: MouseEvent) {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    activeFilterMenu = {
      key: col.id,
      label: col.label,
      x: rect.left,
      y: rect.bottom + 4,
    };
  }
</script>

<div class="overflow-x-auto rounded-lg border border-theme-border">
  <table
    class="block md:table w-full border-collapse text-left"
    data-testid="entity-table"
  >
    <thead
      class="hidden md:table-header-group sticky top-0 z-10 bg-theme-surface"
    >
      <tr class="border-b border-theme-border">
        <th scope="col" class="px-3 py-2 w-10">
          <input
            type="checkbox"
            bind:this={selectAllEl}
            checked={allSelected}
            onchange={() => onToggleAll?.()}
            aria-label="Select all filtered entities"
            data-testid="entity-table-select-all"
            class="h-4 w-4 cursor-pointer accent-theme-primary"
          />
        </th>
        {#each columns as col (col.label)}
          {@const hasActiveFilter = isColumnFiltered(col.id)}
          <th
            scope="col"
            aria-sort={ariaSort(col.key)}
            class="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-theme-muted {col.class ??
              ''}"
          >
            <div class="inline-flex items-center gap-1.5">
              {#if col.key}
                <button
                  type="button"
                  onclick={() => onSort(col.key as SortKey)}
                  class="inline-flex items-center gap-1 hover:text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 rounded"
                  data-testid="entity-table-sort-{col.key}"
                >
                  {col.label}
                  {#if sort.key === col.key}
                    <span
                      class="{sort.direction === 'asc'
                        ? 'icon-[lucide--arrow-up]'
                        : 'icon-[lucide--arrow-down]'} h-3 w-3"
                      aria-hidden="true"
                    ></span>
                  {:else}
                    <span
                      class="icon-[lucide--chevrons-up-down] h-3 w-3 opacity-30"
                      aria-hidden="true"
                    ></span>
                  {/if}
                </button>
              {:else}
                <span>{col.label}</span>
              {/if}

              {#if col.filterable}
                <button
                  type="button"
                  onclick={(e) => openFilterMenu(col, e)}
                  title="Filter by {col.label}"
                  aria-label="Filter by {col.label}"
                  data-testid="column-filter-btn-{col.id}"
                  class="rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {hasActiveFilter
                    ? 'bg-theme-primary/20 text-theme-primary'
                    : 'text-theme-muted/40 hover:text-theme-text'}"
                >
                  <span
                    class="icon-[lucide--filter] h-3 w-3 {hasActiveFilter
                      ? 'stroke-[2.5]'
                      : ''}"
                    aria-hidden="true"
                  ></span>
                </button>
              {/if}
            </div>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody
      class="block md:table-row-group divide-y divide-theme-border/60 md:divide-y-0"
    >
      {#each pageItems as entity (entity.id)}
        <EntityTableRow
          {entity}
          {vaultId}
          {onFilterType}
          {onFilterLabel}
          {showIncompleteOnly}
          selected={selectedIds.has(entity.id)}
          onToggleSelect={onToggleRow}
          onContextMenu={onRowContextMenu}
          connectionSummary={connectionCounts[entity.id] ?? {
            inbound: 0,
            outbound: 0,
            total: 0,
          }}
        />
      {/each}
    </tbody>
  </table>

  {#if activeFilterMenu && onUpdateColumnFilters}
    <TableColumnFilterMenu
      columnKey={activeFilterMenu.key}
      columnLabel={activeFilterMenu.label}
      x={activeFilterMenu.x}
      y={activeFilterMenu.y}
      {columnFilters}
      onUpdateFilters={onUpdateColumnFilters}
      onClose={() => (activeFilterMenu = null)}
    />
  {/if}
  {#if pageCount > 1}
    <nav
      class="flex flex-wrap items-center justify-between gap-2 border-t border-theme-border bg-theme-surface px-3 py-2"
      aria-label="Entity table pages"
      data-testid="entity-table-pagination"
    >
      <p class="text-xs text-theme-muted" aria-live="polite">
        Showing {firstItem}–{lastItem} of {entities.length} filtered entities
      </p>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded px-2 py-1 text-xs text-theme-muted hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
          onclick={() => goToPage(1)}
          disabled={page === 1}
          aria-label="First page"
        >
          <span class="icon-[lucide--chevrons-left] h-4 w-4" aria-hidden="true"
          ></span>
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-xs text-theme-muted hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
          onclick={() => goToPage(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <span class="icon-[lucide--chevron-left] h-4 w-4" aria-hidden="true"
          ></span>
        </button>
        <span
          class="px-2 text-xs font-medium text-theme-text"
          aria-label="Current page"
        >
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          class="rounded px-2 py-1 text-xs text-theme-muted hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
          onclick={() => goToPage(page + 1)}
          disabled={page === pageCount}
          aria-label="Next page"
        >
          <span class="icon-[lucide--chevron-right] h-4 w-4" aria-hidden="true"
          ></span>
        </button>
        <button
          type="button"
          class="rounded px-2 py-1 text-xs text-theme-muted hover:bg-theme-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
          onclick={() => goToPage(pageCount)}
          disabled={page === pageCount}
          aria-label="Last page"
        >
          <span class="icon-[lucide--chevrons-right] h-4 w-4" aria-hidden="true"
          ></span>
        </button>
      </div>
    </nav>
  {/if}
</div>
