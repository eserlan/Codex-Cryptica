<script lang="ts">
  import { GEOGRAPHY_MAX_RADIUS } from "hex-crawl-engine";
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

  function onRadiusChange(event: Event & { currentTarget: HTMLInputElement }) {
    if (!review) return;
    store.setRadius(Number(event.currentTarget.value));
    event.currentTarget.value = String(
      store.review?.proposal.request.radius ?? review.proposal.request.radius,
    );
  }

  function onSeedChange(event: Event & { currentTarget: HTMLInputElement }) {
    if (!review) return;
    if (!store.setSeed(event.currentTarget.value)) {
      event.currentTarget.value = review.proposal.request.seed;
    }
  }
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
      )} coast edges and {sitesCount} sites proposed.
    </p>
    <p class="mt-1 text-xs text-theme-text">
      Generated locally, AI off. Tap the checkmarks on the map to reject or
      restore a feature. Existing terrain, pinned places and authored
      connections stay fixed.
    </p>
    {#if !collapsed}
      <div class="mt-3 space-y-3">
        <label class="block space-y-1 text-xs">
          <span class="font-bold">Civilisation</span>
          <select
            class="min-h-11 w-full rounded-lg border border-theme-border bg-theme-bg px-2 text-theme-text"
            value={review.proposal.request.civilisation}
            onchange={(event) =>
              store.setCivilisation(
                event.currentTarget.value as
                  "wilderness" | "frontier" | "settled",
              )}
          >
            <option value="wilderness">Wilderness</option>
            <option value="frontier">Frontier</option>
            <option value="settled">Settled</option>
          </select>
        </label>
        <label class="block space-y-1 text-xs">
          <span class="font-bold">Radius (hexes)</span>
          <input
            class="min-h-11 w-full rounded-lg border border-theme-border bg-theme-bg px-2 text-theme-text"
            aria-label="Geography radius"
            type="number"
            min="1"
            max={GEOGRAPHY_MAX_RADIUS}
            step="1"
            value={review.proposal.request.radius}
            onchange={onRadiusChange}
          />
        </label>
        <label class="block space-y-1 text-xs">
          <span class="font-bold">Seed</span>
          <input
            class="min-h-11 w-full rounded-lg border border-theme-border bg-theme-bg px-2 text-theme-text"
            aria-label="Geography seed"
            value={review.proposal.request.seed}
            maxlength="32"
            onchange={onSeedChange}
          />
        </label>
        <button
          type="button"
          onclick={() => store.reroll()}
          class="min-h-11 w-full rounded-lg border border-theme-border px-2 text-xs font-bold"
          >Reroll proposals</button
        >
        <p class="text-xs text-theme-text">
          Accepted sites are map suggestions, not Vault entities. Select a site
          later to link or create a location.
        </p>
        <p class="text-xs text-theme-text">
          {review.disabledEdges.size} edges and {review.disabledSites.size} sites
          rejected.
        </p>
      </div>
    {/if}
    {#if store.message === "stale"}
      <p role="alert" class="mt-2 text-xs">
        The map changed during review. Cancel and regenerate to preserve its
        fixed features.
      </p>
    {:else if store.message === "failed"}
      <p role="alert" class="mt-2 text-xs">
        Could not save the geography. No partial changes were applied.
      </p>
    {:else if store.message === "empty"}
      <p role="alert" class="mt-2 text-xs">
        No mapped terrain in range to propose geography.
      </p>
    {/if}
    <div class="sticky bottom-0 mt-3 flex gap-2 bg-theme-surface pt-2">
      <button
        type="button"
        onclick={() => store.cancel()}
        class="min-h-11 flex-1 rounded-lg border border-theme-border text-sm font-bold"
        >Cancel</button
      >
      <button
        type="button"
        onclick={() => store.accept()}
        disabled={store.busy || edgesCount + sitesCount === 0}
        class="min-h-11 flex-1 rounded-lg bg-theme-primary text-sm font-bold text-theme-on-primary disabled:opacity-50"
        >Accept</button
      >
    </div>
  </section>
{/if}
