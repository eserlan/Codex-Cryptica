<script lang="ts">
  import type { GeographyGenerationStore } from "#lib/stores/hex-crawl/geography-generation.svelte.js";

  let { store }: { store: GeographyGenerationStore } = $props();
  const review = $derived(store.review);
  let collapsed = $state(false);
  const edgesCount = $derived(
    review
      ? Object.keys(review.proposal.edges).length - review.disabledEdges.size
      : 0,
  );
  const sitesCount = $derived(
    review
      ? Object.keys(review.proposal.sites).length - review.disabledSites.size
      : 0,
  );
  const countOf = (kind: "coast" | "river" | "road") =>
    review
      ? Object.entries(review.proposal.edges).filter(
          ([key, edge]) =>
            !review.disabledEdges.has(key) &&
            (kind === "coast"
              ? edge.coast
              : kind === "river"
                ? edge.river
                : edge.road),
        ).length
      : 0;
</script>

{#if review}
  <section
    data-testid="geography-review-bar"
    aria-label="Review generated geography"
    class="pointer-events-auto absolute bottom-2 right-2 z-40 w-[calc(100%-1rem)] max-w-96 max-h-[70%] overflow-y-auto rounded-xl border border-theme-border bg-theme-surface p-3 text-theme-text shadow-xl"
  >
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-sm font-bold">Rivers, roads & settlements</h2>
      <button
        type="button"
        class="min-h-11 min-w-11 rounded-lg"
        aria-label={collapsed ? "Expand review" : "Collapse review"}
        aria-expanded={!collapsed}
        onclick={() => (collapsed = !collapsed)}
      >
        <span
          class={collapsed
            ? "icon-[lucide--chevron-up] h-4 w-4"
            : "icon-[lucide--chevron-down] h-4 w-4"}
          aria-hidden="true"
        ></span>
      </button>
    </div>
    <p class="text-xs">
      {countOf("river")} river segments, {countOf("road")} road/path segments, {countOf(
        "coast",
      )} coast edges and {sitesCount} sites propose...[truncated]