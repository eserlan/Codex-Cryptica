<script lang="ts">
  import type { Snippet } from "svelte";

  export interface ReviewCollectionItem<T> {
    item: T;
    index: number;
    id: string;
    title: string;
    subtitle?: string;
    searchText?: string;
  }

  let {
    collectionKey,
    title,
    emptyMessage,
    entries,
    pageSize = 50,
    recordHeaderBadges,
    recordBody,
  }: {
    collectionKey: string;
    title: string;
    emptyMessage: string;
    entries: ReviewCollectionItem<any>[];
    pageSize?: number;
    recordHeaderBadges?: Snippet<[ReviewCollectionItem<any>]>;
    recordBody: Snippet<[ReviewCollectionItem<any>]>;
  } = $props();

  let sectionOpen = $state(false);
  let searchQuery = $state("");
  let visibleLimit = $state(50);
  let expandedIds = $state<Record<string, boolean>>({});

  function toggleSection(event: MouseEvent): void {
    event.preventDefault();
    sectionOpen = !sectionOpen;
  }

  function toggleRecord(event: MouseEvent, id: string): void {
    event.preventDefault();
    expandedIds = { ...expandedIds, [id]: !expandedIds[id] };
  }

  const normalizedQuery = $derived(searchQuery.trim().toLowerCase());

  const filteredEntries = $derived.by(() => {
    if (!normalizedQuery) return entries;
    return entries.filter((entry) => {
      const haystack =
        `${entry.title} ${entry.id} ${entry.subtitle ?? ""} ${entry.searchText ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  });

  const visibleEntries = $derived(filteredEntries.slice(0, visibleLimit));
  const remainingCount = $derived(
    Math.max(0, filteredEntries.length - visibleEntries.length),
  );

  function isRecordOpen(id: string): boolean {
    return Boolean(expandedIds[id]);
  }

  function handleQueryInput(value: string): void {
    searchQuery = value;
    visibleLimit = pageSize;
  }
</script>

{#snippet filterBar()}
  {#if entries.length > 0}
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="relative min-w-48 flex-1">
        <label for="review-{collectionKey}-filter" class="sr-only">
          Filter {title} by title or ID
        </label>
        <input
          id="review-{collectionKey}-filter"
          type="search"
          value={searchQuery}
          oninput={(event) =>
            handleQueryInput((event.currentTarget as HTMLInputElement).value)}
          placeholder="Filter {title.toLowerCase()} by name or ID…"
          data-testid="review-{collectionKey}-filter"
          class="min-h-10 w-full rounded-lg border border-theme-text/75 bg-theme-bg px-3 py-1.5 text-xs text-theme-text placeholder:text-theme-text/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
        />
      </div>
      {#if normalizedQuery}
        <span
          class="text-xs text-theme-text"
          role="status"
          aria-live="polite"
          data-testid="review-{collectionKey}-filter-count"
        >
          Showing {filteredEntries.length} of {entries.length}
        </span>
      {/if}
    </div>
  {/if}
{/snippet}

{#snippet recordRow(entry: ReviewCollectionItem<any>)}
  {@const open = isRecordOpen(entry.id)}
  <li
    class="rounded-lg border border-theme-border bg-theme-bg"
    data-testid="review-{collectionKey}-item-{entry.index}"
  >
    <details
      class="group"
      {open}
      data-testid="review-{collectionKey}-record-{entry.index}"
    >
      <summary
        onclick={(event) => toggleRecord(event, entry.id)}
        class="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm text-theme-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text [&::-webkit-details-marker]:hidden"
        data-testid="review-{collectionKey}-record-summary-{entry.index}"
      >
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <span class="font-semibold text-theme-text">{entry.title}</span>
          {#if entry.subtitle}
            <span class="text-xs text-theme-text">({entry.subtitle})</span>
          {/if}
          {#if entry.title !== entry.id}
            <span class="font-mono text-xs text-theme-text">{entry.id}</span>
          {/if}
        </div>
        <div class="flex items-center gap-2">
          {@render recordHeaderBadges?.(entry)}
          <span
            class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 text-theme-text transition-transform group-open:rotate-180"
            aria-hidden="true"
          ></span>
        </div>
      </summary>
      {#if open}
        <div
          class="space-y-2 border-t border-theme-border px-3 py-3 text-sm text-theme-text"
          data-testid="review-{collectionKey}-record-body-{entry.index}"
        >
          {@render recordBody(entry)}
        </div>
      {/if}
    </details>
  </li>
{/snippet}

{#snippet windowControls()}
  {#if remainingCount > 0}
    <div class="flex items-center justify-between gap-2 pt-2">
      <span
        class="text-xs text-theme-text"
        data-testid="review-{collectionKey}-window-status"
      >
        Showing {visibleEntries.length} of {filteredEntries.length}
      </span>
      <button
        type="button"
        data-testid="review-{collectionKey}-show-more"
        onclick={() => (visibleLimit += pageSize)}
        class="min-h-10 rounded-lg border border-theme-text/75 bg-theme-surface px-3 py-1.5 text-xs font-medium text-theme-text transition hover:bg-theme-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
      >
        Show {Math.min(pageSize, remainingCount)} more ({remainingCount} remaining)
      </button>
    </div>
  {/if}
{/snippet}

{#snippet recordList()}
  {#if entries.length === 0}
    <p class="text-sm text-theme-text">{emptyMessage}</p>
  {:else if filteredEntries.length === 0}
    <p
      class="text-sm text-theme-text"
      data-testid="review-{collectionKey}-no-matches"
    >
      No {title.toLowerCase()} match “{searchQuery.trim()}”.
    </p>
  {:else}
    <ul class="space-y-2" data-testid="review-{collectionKey}-list">
      {#each visibleEntries as entry (entry.id)}
        {@render recordRow(entry)}
      {/each}
    </ul>
    {@render windowControls()}
  {/if}
{/snippet}

<section
  class="rounded-xl border border-theme-border bg-theme-surface p-5"
  aria-labelledby="review-{collectionKey}-heading"
  data-testid="review-{collectionKey}"
>
  <details
    class="group"
    open={sectionOpen}
    data-testid="review-{collectionKey}-disclosure"
  >
    <summary
      onclick={toggleSection}
      class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text [&::-webkit-details-marker]:hidden"
      data-testid="review-{collectionKey}-summary"
    >
      <h2
        id="review-{collectionKey}-heading"
        class="font-header text-lg font-semibold text-theme-text"
      >
        {title} ({entries.length})
      </h2>
      <span
        class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 text-theme-text transition-transform group-open:rotate-180"
        aria-hidden="true"
      ></span>
    </summary>

    {#if sectionOpen}
      <div class="mt-3 space-y-3 border-t border-theme-border pt-3">
        {@render filterBar()}
        {@render recordList()}
      </div>
    {/if}
  </details>
</section>
