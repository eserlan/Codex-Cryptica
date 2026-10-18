<script lang="ts">
  import type {
    DistributionItem,
    VaultDistributionSummary,
  } from "./vaultDistribution";

  let {
    summary,
    activeTypeFilter = null,
    activeLabelFilter = null,
    activeLabelMode = null,
    onSelectCategory,
    onSelectLabel,
    onSelectUnlabelled,
  }: {
    summary: VaultDistributionSummary;
    activeTypeFilter?: string | null;
    activeLabelFilter?: string | null;
    activeLabelMode?: string | null;
    onSelectCategory: (typeId: string) => void;
    onSelectLabel: (label: string) => void;
    onSelectUnlabelled: () => void;
  } = $props();

  let groupBy = $state<"category" | "label">("category");
  let viewMode = $state<"bars" | "table">("bars");

  const currentItems = $derived(
    groupBy === "category" ? summary.categories : summary.labels,
  );

  const maxCount = $derived.by(() => {
    let max = 1;
    const items = currentItems;
    for (let i = 0; i < items.length; i++) {
      if (items[i].count > max) {
        max = items[i].count;
      }
    }
    return max;
  });

  function isItemActive(item: DistributionItem): boolean {
    if (groupBy === "category") {
      return activeTypeFilter === item.id;
    }
    if (item.isUnlabelled) {
      return activeLabelMode === "missing";
    }
    return activeLabelFilter === item.labelValue;
  }

  function handleItemClick(item: DistributionItem) {
    if (groupBy === "category") {
      onSelectCategory(item.id);
    } else if (item.isUnlabelled) {
      onSelectUnlabelled();
    } else {
      onSelectLabel(item.labelValue ?? item.label);
    }
  }

  function handleTabKeydown(
    event: KeyboardEvent,
    selectedIndex: number,
    select: (index: number) => void,
  ) {
    const lastIndex = 1;
    let nextIndex: number;
    if (event.key === "ArrowRight") {
      nextIndex = (selectedIndex + 1) % (lastIndex + 1);
    } else if (event.key === "ArrowLeft") {
      nextIndex = (selectedIndex + lastIndex) % (lastIndex + 1);
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    } else {
      return;
    }

    event.preventDefault();
    select(nextIndex);
    const tabs =
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')
        : [];
    tabs[nextIndex]?.focus();
  }

  function getBarWidth(count: number): number {
    if (count <= 0) return 0;
    return Math.max(2, Math.round((count / maxCount) * 100));
  }
</script>

{#snippet barRow(item: DistributionItem)}
  {@const isActive = isItemActive(item)}
  {@const barWidth = getBarWidth(item.count)}
  <button
    type="button"
    onclick={() => handleItemClick(item)}
    class="group flex flex-col gap-1.5 rounded-lg border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40 {isActive
      ? 'border-theme-primary bg-theme-primary/10 shadow-xs'
      : 'border-theme-border/50 bg-theme-bg/50 hover:border-theme-primary/40 hover:bg-theme-primary/5'}"
    data-testid={`distribution-bar-${item.id}`}
    aria-label={`Filter by ${groupBy === "category" ? "category" : "label"} ${item.label}: ${item.count} matching`}
  >
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        {#if item.icon}
          <span
            class="{item.icon} h-3.5 w-3.5 shrink-0"
            style={item.color ? `color: ${item.color}` : undefined}
            aria-hidden="true"
          ></span>
        {/if}
        <span class="truncate text-xs font-semibold text-theme-text">
          {item.label}
        </span>
      </div>

      <div class="flex items-center gap-1.5 shrink-0 text-xs">
        <span
          class="font-bold text-theme-text"
          data-testid={`distribution-count-${item.id}`}
        >
          {item.count}
        </span>
        {#if summary.isFiltered && item.count !== item.totalCount}
          <span class="text-nano text-theme-muted">
            / {item.totalCount}
          </span>
        {/if}
        <span class="text-nano font-medium text-theme-muted">
          ({item.percentage}%)
        </span>
      </div>
    </div>

    <!-- Horizontal Bar Fill -->
    <div
      class="h-2 w-full overflow-hidden rounded-full bg-theme-border/30"
      role="progressbar"
      aria-label={`${item.label} count`}
      aria-valuenow={item.count}
      aria-valuemin={0}
      aria-valuemax={maxCount}
    >
      <div
        class="h-full rounded-full transition-all duration-300"
        style="width: {barWidth}%; background-color: {item.color ??
          'var(--color-theme-primary, #10b981)'};"
      ></div>
    </div>
  </button>
{/snippet}

{#snippet tableRow(item: DistributionItem)}
  {@const isActive = isItemActive(item)}
  <tr
    class="border-b border-theme-border/30 transition-colors {isActive
      ? 'bg-theme-primary/10 font-semibold'
      : 'hover:bg-theme-surface'}"
    data-testid={`distribution-row-${item.id}`}
  >
    <td class="px-3 py-2">
      <div class="flex items-center gap-2">
        {#if item.icon}
          <span
            class="{item.icon} h-3.5 w-3.5 shrink-0"
            style={item.color ? `color: ${item.color}` : undefined}
            aria-hidden="true"
          ></span>
        {/if}
        <span>{item.label}</span>
      </div>
    </td>
    <td class="px-3 py-2 text-right font-mono font-bold text-theme-text">
      {item.count}
    </td>
    <td class="px-3 py-2 text-right font-mono text-theme-muted">
      {item.percentage}%
    </td>
    <td class="px-3 py-2 text-right font-mono text-theme-muted">
      {item.totalCount}
    </td>
    <td class="px-3 py-2 text-right">
      <button
        type="button"
        onclick={() => handleItemClick(item)}
        class="rounded-md border border-theme-border px-2 py-0.5 text-nano font-medium transition hover:border-theme-primary/50 hover:bg-theme-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"
        data-testid={`distribution-filter-btn-${item.id}`}
      >
        {isActive ? "Clear" : "Filter"}
      </button>
    </td>
  </tr>
{/snippet}

{#snippet toolbar()}
  <div class="flex flex-wrap items-center justify-between gap-2.5">
    <div
      class="inline-flex rounded-lg border border-theme-border/70 bg-theme-bg/60 p-0.5 text-xs font-medium"
      role="tablist"
      tabindex="-1"
      aria-label="Group distribution by"
      onkeydown={(event) =>
        handleTabKeydown(event, groupBy === "category" ? 0 : 1, (index) => {
          groupBy = index === 0 ? "category" : "label";
        })}
    >
      <button
        type="button"
        role="tab"
        id="distribution-category-tab"
        aria-controls="distribution-panel"
        tabindex={groupBy === "category" ? 0 : -1}
        aria-selected={groupBy === "category"}
        onclick={() => (groupBy = "category")}
        class="flex items-center gap-1.5 rounded-md px-2.5 py-1 transition {groupBy ===
        'category'
          ? 'bg-theme-primary/15 text-theme-primary font-bold shadow-xs'
          : 'text-theme-muted hover:text-theme-text'}"
        data-testid="distribution-group-category"
      >
        <span class="icon-[lucide--layout-grid] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        <span>By Category</span>
        <span class="rounded-full bg-theme-border/40 px-1.5 py-0.2 text-nano">
          {summary.categories.length}
        </span>
      </button>

      <button
        type="button"
        role="tab"
        id="distribution-label-tab"
        aria-controls="distribution-panel"
        tabindex={groupBy === "label" ? 0 : -1}
        aria-selected={groupBy === "label"}
        onclick={() => (groupBy = "label")}
        class="flex items-center gap-1.5 rounded-md px-2.5 py-1 transition {groupBy ===
        'label'
          ? 'bg-theme-primary/15 text-theme-primary font-bold shadow-xs'
          : 'text-theme-muted hover:text-theme-text'}"
        data-testid="distribution-group-label"
      >
        <span class="icon-[lucide--tags] h-3.5 w-3.5" aria-hidden="true"></span>
        <span>By Label</span>
        <span class="rounded-full bg-theme-border/40 px-1.5 py-0.2 text-nano">
          {summary.labels.length}
        </span>
      </button>
    </div>

    <div class="flex items-center gap-3">
      <span
        class="text-micro text-theme-muted"
        data-testid="distribution-summary-text"
      >
        {#if summary.isFiltered}
          <strong>{summary.filteredUniqueEntities}</strong> of {summary.totalUniqueEntities}
          entities matching filters
        {:else}
          <strong>{summary.totalUniqueEntities}</strong> unique entities in vault
        {/if}
      </span>

      <div
        class="inline-flex rounded-lg border border-theme-border/70 bg-theme-bg/60 p-0.5 text-xs"
        role="group"
        aria-label="View format"
      >
        <button
          type="button"
          onclick={() => (viewMode = "bars")}
          class="rounded-md p-1 transition {viewMode === 'bars'
            ? 'bg-theme-primary/15 text-theme-primary'
            : 'text-theme-muted hover:text-theme-text'}"
          title="Bar chart view"
          aria-label="Bar chart view"
          aria-pressed={viewMode === "bars"}
          data-testid="distribution-view-bars"
        >
          <span
            class="icon-[lucide--bar-chart-2] h-3.5 w-3.5"
            aria-hidden="true"
          ></span>
        </button>

        <button
          type="button"
          onclick={() => (viewMode = "table")}
          class="rounded-md p-1 transition {viewMode === 'table'
            ? 'bg-theme-primary/15 text-theme-primary'
            : 'text-theme-muted hover:text-theme-text'}"
          title="Data table view"
          aria-label="Data table view"
          aria-pressed={viewMode === "table"}
          data-testid="distribution-view-table"
        >
          <span class="icon-[lucide--table] h-3.5 w-3.5" aria-hidden="true"
          ></span>
        </button>
      </div>
    </div>
  </div>
{/snippet}

{#snippet labelNote()}
  <div
    class="flex items-center gap-1.5 text-nano text-theme-muted/80 bg-theme-bg/40 px-2.5 py-1 rounded-md border border-theme-border/40"
    data-testid="distribution-label-note"
  >
    <span
      class="icon-[lucide--info] h-3.5 w-3.5 shrink-0 text-theme-primary"
      aria-hidden="true"
    ></span>
    <span>
      Entities may have multiple labels; totals reflect total occurrences across
      entities rather than unique items.
    </span>
  </div>
{/snippet}

{#snippet barsView()}
  <div
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
    data-testid="distribution-bars-grid"
  >
    {#each currentItems as item (item.id)}
      {@render barRow(item)}
    {/each}
  </div>
{/snippet}

{#snippet tableView()}
  <div
    class="overflow-x-auto rounded-lg border border-theme-border/60 bg-theme-bg/30"
    data-testid="distribution-table-wrap"
  >
    <table
      class="w-full text-left text-xs"
      aria-label="Vault distribution breakdown"
    >
      <thead>
        <tr
          class="border-b border-theme-border/60 bg-theme-surface/50 text-nano font-semibold uppercase tracking-wider text-theme-muted"
        >
          <th class="px-3 py-2">
            {groupBy === "category" ? "Category" : "Label"}
          </th>
          <th class="px-3 py-2 text-right">Count</th>
          <th class="px-3 py-2 text-right">Filtered %</th>
          <th class="px-3 py-2 text-right">Vault Total</th>
          <th class="px-3 py-2 text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        {#each currentItems as item (item.id)}
          {@render tableRow(item)}
        {/each}
      </tbody>
    </table>
  </div>
{/snippet}

<div
  class="flex flex-col gap-3"
  data-testid="vault-distribution-chart"
  role="region"
  aria-label="Vault Distribution Overview"
>
  {@render toolbar()}

  <div
    id="distribution-panel"
    role="tabpanel"
    aria-labelledby={groupBy === "category"
      ? "distribution-category-tab"
      : "distribution-label-tab"}
    tabindex="0"
  >
    {#if groupBy === "label"}
      {@render labelNote()}
    {/if}

    {#if currentItems.length === 0}
      <div
        class="rounded-lg border border-dashed border-theme-border p-6 text-center text-xs text-theme-muted"
        data-testid="distribution-empty"
      >
        {groupBy === "category"
          ? "No categories found in this vault."
          : "No labels found in this vault."}
      </div>
    {:else if viewMode === "bars"}
      {@render barsView()}
    {:else}
      {@render tableView()}
    {/if}
  </div>
</div>
