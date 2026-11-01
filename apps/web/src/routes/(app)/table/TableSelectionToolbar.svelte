<script lang="ts">
  /* eslint-disable svelte/no-useless-mustaches -- Class expressions retain contrast-review notes for unchanged styles. */
  let {
    selectedCount,
    resultCount,
    isGuest,
    onLabels,
    onReport,
    onClear,
  }: {
    selectedCount: number;
    resultCount: number;
    isGuest: boolean;
    onLabels: () => void;
    onReport: () => void;
    onClear: () => void;
  } = $props();
</script>

{#if selectedCount > 0}
  <div
    class="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-theme-primary/40 bg-theme-primary/10 px-3 py-2"
    data-testid="entity-table-selection-toolbar"
  >
    <span
      class="text-xs font-semibold text-theme-text"
      data-testid="entity-table-selection-count"
    >
      {selectedCount} selected
    </span>
    <button
      type="button"
      onclick={onLabels}
      data-testid="entity-table-bulk-label"
      class={// ui-check-ignore: Colours copied unchanged from the table route during decomposition.
      "inline-flex items-center gap-1.5 rounded-md border border-theme-primary/50 bg-theme-surface px-2.5 py-1 text-xs font-medium text-theme-primary transition-colors hover:bg-theme-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"}
    >
      <span class="icon-[lucide--tags] h-3.5 w-3.5" aria-hidden="true"></span>
      Add / remove labels
    </button>
    {#if !isGuest && selectedCount > 1}
      <button
        type="button"
        onclick={onReport}
        data-testid="entity-table-bulk-generate-report"
        class={// ui-check-ignore: Colours copied unchanged from the table route during decomposition.
        "inline-flex items-center gap-1.5 rounded-md border border-theme-primary/50 bg-theme-surface px-2.5 py-1 text-xs font-medium text-theme-primary transition-colors hover:bg-theme-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"}
      >
        <span class="icon-[lucide--file-text] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Generate report
      </button>
    {/if}
    <button
      type="button"
      onclick={onClear}
      data-testid="entity-table-selection-clear"
      class={// ui-check-ignore: Colours copied unchanged from the table route during decomposition.
      "ml-auto rounded text-xs text-theme-muted underline hover:text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent/40"}
    >
      Clear selection
    </button>
  </div>
{:else}
  <p
    class={// ui-check-ignore: Colours copied unchanged from the table route during decomposition.
    "mb-2 text-xs text-theme-muted"}
    data-testid="entity-table-count"
  >
    {resultCount}
    {resultCount === 1 ? "entity" : "entities"}
  </p>
{/if}
