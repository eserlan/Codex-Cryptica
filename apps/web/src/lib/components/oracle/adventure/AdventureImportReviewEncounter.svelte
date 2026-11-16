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
    onToggleVisibility: (collection: "encounters", index: number) => void;
  } = $props();
</script>

<section
  class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
  aria-labelledby="review-encounters-heading"
  data-testid="review-encounters"
>
  <h2
    id="review-encounters-heading"
    class="font-header text-lg font-semibold text-theme-text"
  >
    Encounters ({draft.encounters.length})
  </h2>
  {#if draft.encounters.length === 0}
    <p class="text-sm text-theme-text">No encounters in this module.</p>
  {:else}
    <ul class="space-y-3">
      {#each draft.encounters as encounter, index (encounter.id)}
        <li
          class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold text-theme-text"
                >{encounter.title ?? encounter.id}</span
              >
              <AdventureReviewSourceCitation sourceRef={encounter.sourceRef} />
            </div>
            <AdventureReviewEpistemicBadge status={encounter.epistemicStatus} />
          </div>
          <p class="text-sm text-theme-text">{encounter.description}</p>
          {#if encounter.alternativeSolutions.length > 0}
            <ul class="space-y-1 pl-4 text-xs text-theme-text">
              {#each encounter.alternativeSolutions as alt}
                <li><strong>{alt.method}:</strong> {alt.description}</li>
              {/each}
            </ul>
          {/if}
          <AdventureReviewVisibilityControl
            collection="encounters"
            {index}
            visibility={encounter.visibility}
            label={`encounter ${encounter.title ?? encounter.id}`}
            disabled={isLocked}
            onToggle={() => onToggleVisibility("encounters", index)}
          />
        </li>
      {/each}
    </ul>
  {/if}
</section>
