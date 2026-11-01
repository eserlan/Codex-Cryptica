<script lang="ts">
  /* eslint-disable svelte/no-useless-mustaches -- Class expressions retain contrast-review notes for unchanged styles. */
  import type { TableFilters } from "./table-filters.svelte.js";
  import EntityTableSearch from "#lib/components/table/EntityTableSearch.svelte";
  import TableViewPresets from "#lib/components/table/TableViewPresets.svelte";
  import VaultAuditPanel from "#lib/components/table/VaultAuditPanel.svelte";
  import type { VaultAuditCounts } from "#lib/components/table/vaultAudit.js";
  import type { VaultDistributionSummary } from "#lib/components/table/vaultDistribution.js";
  import TableFilterBar from "./TableFilterBar.svelte";
  let {
    filters,
    vaultId,
    typeCounts,
    incompleteCount,
    auditCounts,
    distributionSummary,
    searchStatusMessage,
  }: {
    filters: TableFilters;
    vaultId: string;
    typeCounts: Map<string, number>;
    incompleteCount: number;
    auditCounts: VaultAuditCounts;
    distributionSummary: VaultDistributionSummary;
    searchStatusMessage: string | null;
  } = $props();
  const hasFilterPanel = $derived(
    typeCounts.size > 0 ||
      filters.labelFilters.size > 0 ||
      filters.hasActiveFilters,
  );
</script>

<!-- Controls -->
<div class="flex flex-col gap-2.5 md:gap-3">
  <div class="flex items-center gap-2 md:gap-3">
    <EntityTableSearch
      bind:searchQuery={filters.searchQuery}
      bind:labelFilters={filters.labelFilters}
      onSearchChange={filters.setSearchQuery}
    />

    <!-- Mobile filters toggle button -->
    <button
      type="button"
      onclick={() => (filters.showMobileFilters = !filters.showMobileFilters)}
      aria-expanded={filters.showMobileFilters}
      aria-controls={hasFilterPanel ? "entity-table-filter-panel" : undefined}
      data-testid="entity-table-mobile-filters-toggle"
      class="inline-flex md:hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 shrink-0 {filters.showMobileFilters ||
      filters.activeFilterCount > 0
        ? /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'border-theme-primary bg-theme-primary/10 text-theme-primary'
        : /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'border-theme-border bg-theme-surface text-theme-muted hover:text-theme-text'}"
    >
      <span class="icon-[lucide--filter] h-3.5 w-3.5" aria-hidden="true"></span>
      <span>Filters</span>
      {#if filters.activeFilterCount > 0}
        <span
          class={// ui-check-ignore: Colours copied unchanged from the table route during decomposition.
          "rounded-full bg-theme-primary px-1.5 py-0.2 text-micro font-bold text-theme-bg"}
          data-testid="entity-table-active-filter-badge"
        >
          {filters.activeFilterCount}
        </span>
      {/if}
    </button>

    <!-- Mobile Audit toggle button -->
    <button
      type="button"
      onclick={filters.toggleAuditPanel}
      aria-pressed={filters.showAuditPanel}
      aria-expanded={filters.showAuditPanel}
      aria-controls={filters.showAuditPanel ? "vault-audit-panel" : undefined}
      data-testid="entity-table-mobile-audit-toggle"
      class="inline-flex md:hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 shrink-0 {filters.showAuditPanel
        ? /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'border-theme-primary bg-theme-primary/10 text-theme-primary'
        : /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'border-theme-border bg-theme-surface text-theme-muted hover:text-theme-text'}"
    >
      <span
        class="icon-[lucide--clipboard-check] h-3.5 w-3.5"
        aria-hidden="true"
      ></span>
      <span>Audit</span>
    </button>

    <!-- Desktop Incomplete only toggle -->
    <button
      type="button"
      onclick={filters.toggleIncompleteOnly}
      aria-pressed={filters.showIncompleteOnly}
      data-testid="entity-table-incomplete-filter"
      class="hidden md:inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {filters.showIncompleteOnly
        ? /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
        : /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'border-theme-border bg-theme-surface text-theme-muted hover:border-amber-500/50 hover:text-theme-text'}"
    >
      <span class="icon-[lucide--alert-circle] h-3.5 w-3.5" aria-hidden="true"
      ></span>
      Incomplete only
      <span
        class="rounded-full px-1.5 py-0.2 text-micro {filters.showIncompleteOnly
          ? /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold'
          : /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'bg-theme-border text-theme-muted'}"
      >
        {incompleteCount}
      </span>
    </button>

    <!-- Desktop Audit toggle -->
    <button
      type="button"
      onclick={filters.toggleAuditPanel}
      aria-pressed={filters.showAuditPanel}
      aria-expanded={filters.showAuditPanel}
      aria-controls={filters.showAuditPanel ? "vault-audit-panel" : undefined}
      data-testid="entity-table-audit-toggle"
      class="hidden md:inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {filters.showAuditPanel
        ? /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'border-theme-primary bg-theme-primary/15 text-theme-primary'
        : /* ui-check-ignore: Colours copied unchanged from the table route during decomposition. */ 'border-theme-border bg-theme-surface text-theme-muted hover:border-theme-primary/50 hover:text-theme-text'}"
    >
      <span
        class="icon-[lucide--clipboard-check] h-3.5 w-3.5"
        aria-hidden="true"
      ></span>
      Audit
    </button>

    <TableViewPresets
      activeVaultId={vaultId}
      currentFilterState={filters}
      onApplyPreset={filters.handleApplyPreset}
      onResetFilters={filters.handleResetFilters}
    />
  </div>

  {@render auditPanel()}

  {#if searchStatusMessage}
    <p
      class={// ui-check-ignore: Colours copied unchanged from the table route during decomposition.
      "text-micro text-theme-muted"}
      aria-live="polite"
    >
      {searchStatusMessage}
    </p>
  {/if}

  <TableFilterBar {filters} {typeCounts} {incompleteCount} {hasFilterPanel} />
</div>

{#snippet auditPanel()}
  {#if filters.showAuditPanel}
    <VaultAuditPanel
      counts={auditCounts}
      {distributionSummary}
      activeTypeFilter={filters.typeFilters.size === 1
        ? Array.from(filters.typeFilters)[0]
        : null}
      activeLabelFilter={filters.labelFilters.size === 1
        ? Array.from(filters.labelFilters)[0]
        : null}
      activeLabelMode={filters.columnFilters.labelMode ?? null}
      activeTab={filters.auditPanelTab}
      onTabChange={(tab) => (filters.auditPanelTab = tab)}
      onSelectCategory={filters.handleSelectDistributionCategory}
      onSelectLabel={filters.handleSelectDistributionLabel}
      onSelectUnlabelled={filters.handleSelectDistributionUnlabelled}
      activePresetId={filters.activeAuditPresetId}
      onApplyPreset={filters.handleApplyAuditPreset}
      onDrillDown={filters.handleAuditDrillDown}
      onClose={() => (filters.showAuditPanel = false)}
    />
  {/if}
{/snippet}
