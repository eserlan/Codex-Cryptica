<script lang="ts">
  import type {
    ConnectionsFilterMode,
    DateFilterMode,
    LabelFilterMode,
    SummaryFilterMode,
    TableColumnFilters,
  } from "$lib/components/explorer/entityListFiltering";

  let {
    columnKey,
    columnLabel,
    x,
    y,
    columnFilters,
    _allLabels = [],
    onUpdateFilters,
    onClose,
  }: {
    columnKey: string;
    columnLabel: string;
    x: number;
    y: number;
    columnFilters: TableColumnFilters;
    _allLabels?: string[];
    onUpdateFilters: (filters: TableColumnFilters) => void;
    onClose: () => void;
  } = $props();

  let menuEl = $state<HTMLDivElement>();

  $effect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuEl && !menuEl.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      window.addEventListener("click", handleOutsideClick);
    }, 10);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleOutsideClick);
    };
  });

  function setConnectionsMode(mode: ConnectionsFilterMode) {
    onUpdateFilters({
      ...columnFilters,
      connectionsMode: mode === "all" ? undefined : mode,
    });
    onClose();
  }

  function setSummaryMode(mode: SummaryFilterMode) {
    onUpdateFilters({
      ...columnFilters,
      summaryMode: mode === "all" ? undefined : mode,
    });
    onClose();
  }

  function setLabelMode(mode: LabelFilterMode) {
    onUpdateFilters({
      ...columnFilters,
      labelMode: mode === "all" ? undefined : mode,
    });
    onClose();
  }

  function setDateMode(col: "created" | "modified", mode: DateFilterMode) {
    if (col === "created") {
      onUpdateFilters({
        ...columnFilters,
        createdMode: mode === "all" ? undefined : mode,
      });
    } else {
      onUpdateFilters({
        ...columnFilters,
        modifiedMode: mode === "all" ? undefined : mode,
      });
    }
    onClose();
  }

  function clearThisFilter() {
    const next = { ...columnFilters };
    if (columnKey === "connections") delete next.connectionsMode;
    if (columnKey === "summary") delete next.summaryMode;
    if (columnKey === "labels") {
      delete next.labelMode;
      delete next.labelValues;
    }
    if (columnKey === "created") delete next.createdMode;
    if (columnKey === "modified") delete next.modifiedMode;
    onUpdateFilters(next);
    onClose();
  }
</script>

<div
  bind:this={menuEl}
  role="menu"
  tabindex="0"
  aria-label="Filter {columnLabel}"
  data-testid="column-filter-menu-{columnKey}"
  class="fixed z-[100] min-w-[200px] rounded-lg border border-theme-border bg-theme-surface py-2 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
  style:top="{y}px"
  style:left="{Math.max(10, Math.min(x, window.innerWidth - 220))}px"
>
  <div
    class="border-b border-theme-border/40 px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-theme-muted"
  >
    Filter {columnLabel}
  </div>

  {#if columnKey === "connections"}
    {@const active = columnFilters.connectionsMode ?? "all"}
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center justify-between px-3 py-1.5 text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary {active ===
      'all'
        ? 'font-bold text-theme-primary'
        : ''}"
      onclick={() => setConnectionsMode("all")}
    >
      <span>All connections</span>
      {#if active === "all"}
        <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
      {/if}
    </button>
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center justify-between px-3 py-1.5 text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary {active ===
      'zero'
        ? 'font-bold text-theme-primary'
        : ''}"
      onclick={() => setConnectionsMode("zero")}
    >
      <span>Zero connections (0)</span>
      {#if active === "zero"}
        <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
      {/if}
    </button>
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center justify-between px-3 py-1.5 text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary {active ===
      'has_connections'
        ? 'font-bold text-theme-primary'
        : ''}"
      onclick={() => setConnectionsMode("has_connections")}
    >
      <span>Connected (1+)</span>
      {#if active === "has_connections"}
        <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
      {/if}
    </button>
  {:else if columnKey === "summary"}
    {@const active = columnFilters.summaryMode ?? "all"}
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center justify-between px-3 py-1.5 text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary {active ===
      'all'
        ? 'font-bold text-theme-primary'
        : ''}"
      onclick={() => setSummaryMode("all")}
    >
      <span>All rows</span>
      {#if active === "all"}
        <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
      {/if}
    </button>
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center justify-between px-3 py-1.5 text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary {active ===
      'missing_summary'
        ? 'font-bold text-theme-primary'
        : ''}"
      onclick={() => setSummaryMode("missing_summary")}
    >
      <span>Missing summary</span>
      {#if active === "missing_summary"}
        <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
      {/if}
    </button>
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center justify-between px-3 py-1.5 text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary {active ===
      'has_summary'
        ? 'font-bold text-theme-primary'
        : ''}"
      onclick={() => setSummaryMode("has_summary")}
    >
      <span>Has summary</span>
      {#if active === "has_summary"}
        <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
      {/if}
    </button>
  {:else if columnKey === "labels"}
    {@const active = columnFilters.labelMode ?? "all"}
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center justify-between px-3 py-1.5 text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary {active ===
      'all'
        ? 'font-bold text-theme-primary'
        : ''}"
      onclick={() => setLabelMode("all")}
    >
      <span>All labels</span>
      {#if active === "all"}
        <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
      {/if}
    </button>
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center justify-between px-3 py-1.5 text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary {active ===
      'missing'
        ? 'font-bold text-theme-primary'
        : ''}"
      onclick={() => setLabelMode("missing")}
    >
      <span>No labels (untagged)</span>
      {#if active === "missing"}
        <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
      {/if}
    </button>
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center justify-between px-3 py-1.5 text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary {active ===
      'has_any'
        ? 'font-bold text-theme-primary'
        : ''}"
      onclick={() => setLabelMode("has_any")}
    >
      <span>Has any labels</span>
      {#if active === "has_any"}
        <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
      {/if}
    </button>
  {:else if columnKey === "created" || columnKey === "modified"}
    {@const active =
      columnKey === "created"
        ? (columnFilters.createdMode ?? "all")
        : (columnFilters.modifiedMode ?? "all")}
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center justify-between px-3 py-1.5 text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary {active ===
      'all'
        ? 'font-bold text-theme-primary'
        : ''}"
      onclick={() => setDateMode(columnKey, "all")}
    >
      <span>All dates</span>
      {#if active === "all"}
        <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
      {/if}
    </button>
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center justify-between px-3 py-1.5 text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary {active ===
      'has_date'
        ? 'font-bold text-theme-primary'
        : ''}"
      onclick={() => setDateMode(columnKey, "has_date")}
    >
      <span>Has timestamp</span>
      {#if active === "has_date"}
        <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
      {/if}
    </button>
    <button
      type="button"
      role="menuitem"
      class="flex w-full items-center justify-between px-3 py-1.5 text-xs text-theme-text transition-colors hover:bg-theme-primary/10 hover:text-theme-primary {active ===
      'missing_date'
        ? 'font-bold text-theme-primary'
        : ''}"
      onclick={() => setDateMode(columnKey, "missing_date")}
    >
      <span>Missing timestamp</span>
      {#if active === "missing_date"}
        <span class="icon-[lucide--check] h-3.5 w-3.5"></span>
      {/if}
    </button>
  {/if}

  <div class="mt-1 border-t border-theme-border/40 pt-1">
    <button
      type="button"
      role="menuitem"
      class="w-full px-3 py-1 text-left text-[11px] text-theme-muted hover:text-theme-text"
      onclick={clearThisFilter}
    >
      Reset column filter
    </button>
  </div>
</div>
