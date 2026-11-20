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
    onToggleVisibility: (collection: "factions", index: number) => void;
  } = $props();
</script>

{#if draft.factions.length > 0}
  <section
    class="rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-factions-heading"
    data-testid="review-factions"
  >
    <details class="group" data-testid="review-factions-disclosure">
      <summary
        class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text [&::-webkit-details-marker]:hidden"
        data-testid="review-factions-summary"
      >
        <h2
          id="review-factions-heading"
          class="font-header text-lg font-semibold text-theme-text"
        >
          Factions ({draft.factions.length})
        </h2>
        <span
          class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 text-theme-text transition-transform group-open:rotate-180"
          aria-hidden="true"
        ></span>
      </summary>
      <div class="mt-3 space-y-3 border-t border-theme-border pt-3">
        <ul class="space-y-3">
          {#each draft.factions as faction, index (faction.id)}
            <li
              class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-theme-text"
                    >{faction.name}</span
                  >
                  <AdventureReviewSourceCitation
                    sourceRef={faction.sourceRef}
                  />
                </div>
                <AdventureReviewEpistemicBadge
                  status={faction.epistemicStatus}
                />
              </div>
              <p class="text-sm text-theme-text">{faction.summary}</p>
              <AdventureReviewVisibilityControl
                collection="factions"
                {index}
                visibility={faction.visibility}
                label={`faction ${faction.name}`}
                disabled={isLocked}
                onToggle={() => onToggleVisibility("factions", index)}
              />
            </li>
          {/each}
        </ul>
      </div>
    </details>
  </section>
{/if}
