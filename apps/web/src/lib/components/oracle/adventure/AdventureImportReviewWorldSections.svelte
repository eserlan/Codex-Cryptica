<script lang="ts">
  import type { AdventureJsonV1 } from "@codex/adventure-engine";
  import AdventureReviewSourceCitation from "./AdventureReviewSourceCitation.svelte";
  import AdventureReviewEpistemicBadge from "./AdventureReviewEpistemicBadge.svelte";
  import AdventureReviewVisibilityControl from "./AdventureReviewVisibilityControl.svelte";

  let {
    draft,
    isLocked,
    onToggleVisibility,
  }: {
    draft: AdventureJsonV1;
    isLocked: boolean;
    onToggleVisibility: (
      collection: "locations" | "actors" | "factions",
      index: number,
    ) => void;
  } = $props();
</script>

<section
  class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
  aria-labelledby="review-locations-heading"
  data-testid="review-locations"
>
  <h2
    id="review-locations-heading"
    class="font-header text-lg font-semibold text-theme-text"
  >
    Locations ({draft.locations.length})
  </h2>
  {#if draft.locations.length === 0}
    <p class="text-sm text-theme-text">No locations in this module.</p>
  {:else}
    <ul class="space-y-3">
      {#each draft.locations as loc, index (loc.id)}
        <li
          class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-theme-text">{loc.name}</span>
              <span class="font-mono text-xs text-theme-text">{loc.id}</span>
              <AdventureReviewSourceCitation sourceRef={loc.sourceRef} />
            </div>
            <AdventureReviewEpistemicBadge status={loc.epistemicStatus} />
          </div>
          <p class="text-sm text-theme-text">{loc.summary}</p>
          <AdventureReviewVisibilityControl
            collection="locations"
            {index}
            visibility={loc.visibility}
            label={`location ${loc.name}`}
            disabled={isLocked}
            onToggle={() => onToggleVisibility("locations", index)}
          />
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section
  class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
  aria-labelledby="review-actors-heading"
  data-testid="review-actors"
>
  <h2
    id="review-actors-heading"
    class="font-header text-lg font-semibold text-theme-text"
  >
    Actors ({draft.actors.length})
  </h2>
  {#if draft.actors.length === 0}
    <p class="text-sm text-theme-text">No actors in this module.</p>
  {:else}
    <ul class="space-y-3">
      {#each draft.actors as actor, index (actor.id)}
        <li
          class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-theme-text">{actor.name}</span>
              {#if actor.role}
                <span class="text-xs text-theme-text">({actor.role})</span>
              {/if}
              <AdventureReviewSourceCitation sourceRef={actor.sourceRef} />
            </div>
            <AdventureReviewEpistemicBadge status={actor.epistemicStatus} />
          </div>
          <p class="text-sm text-theme-text">{actor.summary}</p>
          {#if actor.motivation}
            <p class="text-xs text-theme-text">
              Motivation: {actor.motivation}
            </p>
          {/if}
          <AdventureReviewVisibilityControl
            collection="actors"
            {index}
            visibility={actor.visibility}
            label={`actor ${actor.name}`}
            disabled={isLocked}
            onToggle={() => onToggleVisibility("actors", index)}
          />
        </li>
      {/each}
    </ul>
  {/if}
</section>
