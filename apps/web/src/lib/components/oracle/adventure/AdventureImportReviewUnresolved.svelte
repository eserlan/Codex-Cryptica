<script lang="ts">
  import type {
    AdventureJsonValidationError,
    AdventureJsonV1,
    EpistemicStatus,
    SourceReference,
  } from "@codex/adventure-engine";
  import AdventureReviewSourceCitation from "./AdventureReviewSourceCitation.svelte";
  import AdventureReviewEpistemicBadge from "./AdventureReviewEpistemicBadge.svelte";

  type TriageClassification = "blocking" | "unclassified";
  type FilterMode = "all" | TriageClassification;

  interface TriageEntry {
    key: string;
    classification: TriageClassification;
    code: string;
    message: string;
    shortMessage: string;
    relatedEntityId?: string;
    context?: string;
    path?: string;
    epistemicStatus?: EpistemicStatus;
    sourceRef?: SourceReference;
  }

  let {
    draft,
    validationErrors = [],
    pageSize = 50,
  }: {
    draft: AdventureJsonV1;
    validationErrors?: AdventureJsonValidationError[];
    pageSize?: number;
  } = $props();

  let filterMode = $state<FilterMode>("all");
  let visibleLimit = $state(50);
  let expandedKeys = $state<Record<string, boolean>>({});

  function truncateMessage(text: string): string {
    const trimmed = text.trim();
    if (trimmed.length <= 96) return trimmed;
    return `${trimmed.slice(0, 96).trimEnd()}…`;
  }

  function toggleEntry(event: MouseEvent, key: string): void {
    event.preventDefault();
    expandedKeys = { ...expandedKeys, [key]: !expandedKeys[key] };
  }

  function setFilter(mode: FilterMode): void {
    filterMode = mode;
    visibleLimit = pageSize;
  }

  const allEntries = $derived.by<TriageEntry[]>(() => {
    const blocking: TriageEntry[] = validationErrors.map((err, index) => ({
      key: `blocking-${err.code}-${err.path ?? err.entityId ?? index}`,
      classification: "blocking",
      code: err.code,
      message: err.message,
      shortMessage: truncateMessage(err.message),
      relatedEntityId: err.entityId,
      path: err.path,
    }));

    const unresolved: TriageEntry[] = draft.unresolved.map((item) => ({
      key: `unresolved-${item.id}`,
      classification: "unclassified",
      code: item.code,
      message: item.message,
      shortMessage: truncateMessage(item.message),
      relatedEntityId: item.relatedEntityId,
      context: item.context,
      epistemicStatus: item.epistemicStatus,
      sourceRef: item.sourceRef,
    }));

    return [...blocking, ...unresolved];
  });

  const blockingCount = $derived(validationErrors.length);
  const unclassifiedCount = $derived(draft.unresolved.length);

  const filteredEntries = $derived(
    filterMode === "all"
      ? allEntries
      : allEntries.filter((entry) => entry.classification === filterMode),
  );

  const visibleEntries = $derived(filteredEntries.slice(0, visibleLimit));
  const remainingCount = $derived(
    Math.max(0, filteredEntries.length - visibleEntries.length),
  );
</script>

{#snippet approvalPolicyNote()}
  <p
    class="text-xs leading-relaxed text-theme-text"
    data-testid="review-unresolved-policy"
  >
    {#if blockingCount > 0}
      Approval is blocked by {blockingCount} validator
      {blockingCount === 1 ? "error" : "errors"} below.
      {#if unclassifiedCount > 0}
        {unclassifiedCount} unresolved
        {unclassifiedCount === 1 ? "item is" : "items are"} also preserved for review.
      {/if}
    {:else}
      Approval is allowed under current validation rules. Unresolved items are
      preserved for later review and do not block approval, though they may
      affect play.
    {/if}
  </p>
{/snippet}

{#snippet filterControls()}
  {#if blockingCount > 0 && unclassifiedCount > 0}
    <div
      class="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Filter unresolved items by classification"
      data-testid="review-unresolved-filters"
    >
      <button
        type="button"
        data-testid="review-unresolved-filter-all"
        aria-pressed={filterMode === "all"}
        onclick={() => setFilter("all")}
        class="min-h-9 rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text {filterMode ===
        'all'
          ? 'border-theme-primary bg-theme-primary text-theme-on-primary'
          : 'border-theme-text/75 bg-theme-bg text-theme-text hover:bg-theme-primary/10'}"
      >
        All ({allEntries.length})
      </button>
      <button
        type="button"
        data-testid="review-unresolved-filter-blocking"
        aria-pressed={filterMode === "blocking"}
        onclick={() => setFilter("blocking")}
        class="min-h-9 rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text {filterMode ===
        'blocking'
          ? 'border-theme-primary bg-theme-primary text-theme-on-primary'
          : 'border-theme-text/75 bg-theme-bg text-theme-text hover:bg-theme-primary/10'}"
      >
        Blocking ({blockingCount})
      </button>
      <button
        type="button"
        data-testid="review-unresolved-filter-unclassified"
        aria-pressed={filterMode === "unclassified"}
        onclick={() => setFilter("unclassified")}
        class="min-h-9 rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text {filterMode ===
        'unclassified'
          ? 'border-theme-primary bg-theme-primary text-theme-on-primary'
          : 'border-theme-text/75 bg-theme-bg text-theme-text hover:bg-theme-primary/10'}"
      >
        Unclassified / needs review ({unclassifiedCount})
      </button>
    </div>
  {/if}
{/snippet}

{#snippet triageRow(entry: TriageEntry, index: number)}
  {@const isOpen = Boolean(expandedKeys[entry.key])}
  <li
    class="rounded-lg border border-theme-border bg-theme-bg text-sm"
    data-testid="review-unresolved-item-{index}"
  >
    <details
      class="group"
      open={isOpen}
      data-testid="review-unresolved-disclosure-{index}"
    >
      <summary
        onclick={(event) => toggleEntry(event, entry.key)}
        class="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2 text-theme-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text [&::-webkit-details-marker]:hidden"
        data-testid="review-unresolved-summary-{index}"
      >
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span
            class="rounded-full border px-2 py-0.5 text-xs font-semibold text-theme-text {entry.classification ===
            'blocking'
              ? 'border-theme-danger/60 bg-theme-danger/15'
              : 'border-theme-border bg-theme-surface'}"
            data-testid="review-unresolved-classification-{index}"
          >
            {entry.classification === "blocking"
              ? "Blocking"
              : "Unclassified / needs review"}
          </span>
          <span class="font-mono text-xs font-semibold text-theme-text">
            {entry.code}
          </span>
          {#if entry.relatedEntityId}
            <span class="font-mono text-xs text-theme-text">
              ({entry.relatedEntityId})
            </span>
          {/if}
          <AdventureReviewSourceCitation sourceRef={entry.sourceRef} />
          <span class="min-w-0 truncate text-xs text-theme-text">
            {entry.shortMessage}
          </span>
        </div>
        <span
          class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 text-theme-text transition-transform group-open:rotate-180"
          aria-hidden="true"
        ></span>
      </summary>

      {#if isOpen}
        <div
          class="space-y-2 border-t border-theme-border px-3 py-3 text-xs text-theme-text"
          data-testid="review-unresolved-body-{index}"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            {#if entry.path}
              <span class="font-mono text-theme-text">Path: {entry.path}</span>
            {/if}
            {#if entry.epistemicStatus}
              <AdventureReviewEpistemicBadge status={entry.epistemicStatus} />
            {/if}
          </div>
          <p class="text-sm text-theme-text">{entry.message}</p>
          {#if entry.context}
            <p class="text-xs text-theme-text">{entry.context}</p>
          {/if}
        </div>
      {/if}
    </details>
  </li>
{/snippet}

{#if allEntries.length > 0}
  <section
    class="space-y-3 rounded-xl border border-theme-danger/40 bg-theme-surface p-5"
    aria-labelledby="review-unresolved-heading"
    data-testid="review-unresolved"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2
        id="review-unresolved-heading"
        class="font-header text-lg font-semibold text-theme-text"
      >
        Unresolved ({unclassifiedCount})
        {#if blockingCount > 0}
          · {blockingCount} blocking
        {/if}
      </h2>
    </div>

    {@render approvalPolicyNote()}
    {@render filterControls()}

    <ul class="space-y-2" data-testid="review-unresolved-list">
      {#each visibleEntries as entry, index (entry.key)}
        {@render triageRow(entry, index)}
      {/each}
    </ul>

    {#if remainingCount > 0}
      <div class="flex items-center justify-between gap-2 pt-1">
        <span
          class="text-xs text-theme-text"
          data-testid="review-unresolved-window-status"
        >
          Showing {visibleEntries.length} of {filteredEntries.length}
        </span>
        <button
          type="button"
          data-testid="review-unresolved-show-more"
          onclick={() => (visibleLimit += pageSize)}
          class="min-h-10 rounded-lg border border-theme-text/75 bg-theme-surface px-3 py-1.5 text-xs font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
        >
          Show {Math.min(pageSize, remainingCount)} more ({remainingCount} remaining)
        </button>
      </div>
    {/if}
  </section>
{/if}
