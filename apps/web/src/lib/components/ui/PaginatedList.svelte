<script lang="ts" generics="T">
  import type { Snippet } from "svelte";

  interface Props {
    items: readonly T[];
    pageSize?: number;
    page?: number;
    itemLabel?: string;
    listClass?: string;
    getKey?: (item: T, index: number) => string | number;
    summaryText?: (start: number, end: number, total: number) => string;
    row: Snippet<[item: T, index: number]>;
  }

  let {
    items,
    pageSize = 25,
    page = $bindable(0),
    itemLabel = "items",
    listClass = "space-y-2",
    getKey,
    summaryText,
    row,
  }: Props = $props();

  const safePageSize = $derived(Math.max(1, Math.floor(pageSize)));
  const pageCount = $derived(
    Math.max(1, Math.ceil(items.length / safePageSize)),
  );
  const clampedPage = $derived(Math.min(Math.max(0, page), pageCount - 1));
  const pageStart = $derived(clampedPage * safePageSize);
  const pageEnd = $derived(Math.min(pageStart + safePageSize, items.length));
  const visibleItems = $derived(items.slice(pageStart, pageEnd));

  $effect(() => {
    if (page !== clampedPage) page = clampedPage;
  });

  function previousPage() {
    page = Math.max(0, clampedPage - 1);
  }

  function nextPage() {
    page = Math.min(pageCount - 1, clampedPage + 1);
  }
</script>

{#if items.length > 0}
  <ul class={listClass}>
    {#each visibleItems as item, offset (getKey ? getKey(item, pageStart + offset) : pageStart + offset)}
      {@render row(item, pageStart + offset)}
    {/each}
  </ul>

  {#if pageCount > 1}
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-theme-text" aria-live="polite">
        {#if summaryText}
          {summaryText(pageStart + 1, pageEnd, items.length)}
        {:else}
          Showing {pageStart + 1}–{pageEnd} of {items.length} {itemLabel}
        {/if}
      </p>
      <div class="flex gap-2">
        <button
          type="button"
          class="min-h-10 rounded-md border border-theme-text px-3 text-sm text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text disabled:cursor-not-allowed"
          disabled={clampedPage === 0}
          onclick={previousPage}
        >
          Previous {itemLabel}
        </button>
        <button
          type="button"
          class="min-h-10 rounded-md border border-theme-text px-3 text-sm text-theme-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-text disabled:cursor-not-allowed"
          disabled={clampedPage >= pageCount - 1}
          onclick={nextPage}
        >
          Next {itemLabel}
        </button>
      </div>
    </div>
  {/if}
{/if}
