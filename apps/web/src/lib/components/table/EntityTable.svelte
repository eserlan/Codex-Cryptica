<script lang="ts">
  import type { Entity } from "schema";
  import type {
    ConnectionSummary,
    SortKey,
    SortState,
  } from "./entityTableSort";
  import EntityTableRow from "./EntityTableRow.svelte";

  let {
    entities,
    vaultId,
    sort,
    connectionCounts = {},
    onSort,
    selectedIds = new Set<string>(),
    allSelected = false,
    someSelected = false,
    onToggleRow,
    onToggleAll,
  }: {
    entities: Entity[];
    vaultId: string;
    sort: SortState;
    connectionCounts?: Record<string, ConnectionSummary>;
    onSort: (key: SortKey) => void;
    selectedIds?: Set<string>;
    allSelected?: boolean;
    someSelected?: boolean;
    onToggleRow?: (id: string) => void;
    onToggleAll?: () => void;
  } = $props();

  // <input indeterminate> can't be set via attribute — bind the element.
  let selectAllEl = $state<HTMLInputElement | null>(null);
  $effect(() => {
    if (selectAllEl) selectAllEl.indeterminate = someSelected;
  });

  interface Column {
    key: SortKey | null;
    label: string;
    /** Tailwind width / layout hints for the header cell. */
    class?: string;
  }

  const columns: Column[] = [
    { key: "title", label: "Name", class: "min-w-[12rem]" },
    { key: "type", label: "Type", class: "min-w-[8rem]" },
    { key: "connections", label: "Connections", class: "min-w-[9rem]" },
    { key: null, label: "Summary", class: "min-w-[16rem]" },
    { key: null, label: "Tags", class: "min-w-[8rem]" },
    { key: "created", label: "Created", class: "min-w-[7rem]" },
    { key: "modified", label: "Modified", class: "min-w-[7rem]" },
  ];

  function ariaSort(key: SortKey | null): "ascending" | "descending" | "none" {
    if (key === null || sort.key !== key) return "none";
    return sort.direction === "asc" ? "ascending" : "descending";
  }
</script>

<div class="overflow-x-auto rounded-lg border border-theme-border">
  <table class="w-full border-collapse text-left" data-testid="entity-table">
    <thead class="sticky top-0 z-10 bg-theme-surface">
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
          <th
            scope="col"
            aria-sort={ariaSort(col.key)}
            class="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-theme-muted {col.class ??
              ''}"
          >
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
              {col.label}
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each entities as entity (entity.id)}
        <EntityTableRow
          {entity}
          {vaultId}
          selected={selectedIds.has(entity.id)}
          onToggleSelect={onToggleRow}
          connectionSummary={connectionCounts[entity.id] ?? {
            inbound: 0,
            outbound: 0,
            total: 0,
          }}
        />
      {/each}
    </tbody>
  </table>
</div>
