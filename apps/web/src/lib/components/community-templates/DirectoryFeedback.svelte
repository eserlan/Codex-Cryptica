<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * The loading, error, empty and "load more" states shared by the community
   * template lists. The results themselves are the children.
   */
  let {
    isLoading,
    hasResults,
    error,
    onRetry,
    hasMore = false,
    onLoadMore = () => {},
    emptyMessage = "No community templates match those filters.",
    children,
  }: {
    isLoading: boolean;
    hasResults: boolean;
    error: string;
    onRetry: () => void;
    hasMore?: boolean;
    onLoadMore?: () => void;
    emptyMessage?: string;
    children: Snippet;
  } = $props();
</script>

{#if isLoading && !hasResults}
  <p class="py-12 text-center text-sm text-theme-muted" role="status">
    Loading community templates…
  </p>
{:else if error}
  <div
    class="rounded-lg border border-theme-border bg-theme-surface p-6 text-sm text-theme-text"
    role="alert"
  >
    <p>{error}</p>
    <button
      type="button"
      class="mt-3 text-theme-primary underline"
      onclick={onRetry}>Try again</button
    >
  </div>
{:else if !hasResults}
  <p
    class="rounded-lg border border-theme-border bg-theme-surface p-12 text-center text-sm text-theme-muted"
  >
    {emptyMessage}
  </p>
{:else}
  {@render children()}
  {#if hasMore}
    <button
      type="button"
      class="mx-auto block rounded-lg border border-theme-border px-4 py-2 text-sm text-theme-text hover:border-theme-primary"
      onclick={onLoadMore}
      disabled={isLoading}>Load more</button
    >
  {/if}
{/if}
