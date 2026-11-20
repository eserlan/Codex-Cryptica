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
      collection: "clues" | "rumours" | "items",
      index: number,
    ) => void;
  } = $props();
</script>

<section
  class="rounded-xl border border-theme-border bg-theme-surface p-5"
  aria-labelledby="review-clues-heading"
  data-testid="review-clues"
>
  <details class="group" data-testid="review-clues-disclosure">
    <summary
      class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text [&::-webkit-details-marker]:hidden"
      data-testid="review-clues-summary"
    >
      <h2
        id="review-clues-heading"
        class="font-header text-lg font-semibold text-theme-text"
      >
        Clues ({draft.clues.length})
      </h2>
      <span
        class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 text-theme-text transition-transform group-open:rotate-180"
        aria-hidden="true"
      ></span>
    </summary>
    <div class="mt-3 space-y-3 border-t border-theme-border pt-3">
      {#if draft.clues.length === 0}
        <p class="text-sm text-theme-text">No clues in this module.</p>
      {:else}
        <ul class="space-y-3">
          {#each draft.clues as clue, index (clue.id)}
            <li
              class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-mono text-xs text-theme-text"
                    >{clue.id}</span
                  >
                  <AdventureReviewSourceCitation sourceRef={clue.sourceRef} />
                </div>
                <AdventureReviewEpistemicBadge status={clue.epistemicStatus} />
              </div>
              <p class="text-sm text-theme-text">{clue.text}</p>
              <AdventureReviewVisibilityControl
                collection="clues"
                {index}
                visibility={clue.visibility}
                label={`clue ${index + 1}`}
                disabled={isLocked}
                onToggle={() => onToggleVisibility("clues", index)}
              />
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </details>
</section>

{#if draft.rumours.length > 0}
  <section
    class="rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-rumours-heading"
    data-testid="review-rumours"
  >
    <details class="group" data-testid="review-rumours-disclosure">
      <summary
        class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text [&::-webkit-details-marker]:hidden"
        data-testid="review-rumours-summary"
      >
        <h2
          id="review-rumours-heading"
          class="font-header text-lg font-semibold text-theme-text"
        >
          Rumours ({draft.rumours.length})
        </h2>
        <span
          class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 text-theme-text transition-transform group-open:rotate-180"
          aria-hidden="true"
        ></span>
      </summary>
      <div class="mt-3 space-y-3 border-t border-theme-border pt-3">
        <ul class="space-y-3">
          {#each draft.rumours as rumour, index (rumour.id)}
            <li
              class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-mono text-xs text-theme-text"
                    >{rumour.truth}</span
                  >
                  <AdventureReviewSourceCitation sourceRef={rumour.sourceRef} />
                </div>
                <AdventureReviewEpistemicBadge
                  status={rumour.epistemicStatus}
                />
              </div>
              <p class="text-sm text-theme-text">{rumour.text}</p>
              <AdventureReviewVisibilityControl
                collection="rumours"
                {index}
                visibility={rumour.visibility}
                label={`rumour ${index + 1}`}
                disabled={isLocked}
                onToggle={() => onToggleVisibility("rumours", index)}
              />
            </li>
          {/each}
        </ul>
      </div>
    </details>
  </section>
{/if}

{#if draft.items.length > 0}
  <section
    class="rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-items-heading"
    data-testid="review-items"
  >
    <details class="group" data-testid="review-items-disclosure">
      <summary
        class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text [&::-webkit-details-marker]:hidden"
        data-testid="review-items-summary"
      >
        <h2
          id="review-items-heading"
          class="font-header text-lg font-semibold text-theme-text"
        >
          Items ({draft.items.length})
        </h2>
        <span
          class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 text-theme-text transition-transform group-open:rotate-180"
          aria-hidden="true"
        ></span>
      </summary>
      <div class="mt-3 space-y-3 border-t border-theme-border pt-3">
        <ul class="space-y-3">
          {#each draft.items as item, index (item.id)}
            <li
              class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-theme-text">{item.name}</span>
                  <AdventureReviewSourceCitation sourceRef={item.sourceRef} />
                </div>
                <AdventureReviewEpistemicBadge status={item.epistemicStatus} />
              </div>
              <p class="text-sm text-theme-text">{item.summary}</p>
              <AdventureReviewVisibilityControl
                collection="items"
                {index}
                visibility={item.visibility}
                label={`item ${item.name}`}
                disabled={isLocked}
                onToggle={() => onToggleVisibility("items", index)}
              />
            </li>
          {/each}
        </ul>
      </div>
    </details>
  </section>
{/if}
