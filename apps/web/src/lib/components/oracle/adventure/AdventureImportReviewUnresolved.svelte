<script lang="ts">
  import type { AdventureJsonV1 } from "@codex/adventure-engine";
  import AdventureReviewSourceCitation from "./AdventureReviewSourceCitation.svelte";
  import AdventureReviewEpistemicBadge from "./AdventureReviewEpistemicBadge.svelte";
  let { draft }: { draft: AdventureJsonV1 } = $props();
</script>

{#if draft.unresolved.length > 0}
  <section
    class="space-y-3 rounded-xl border border-theme-danger/40 bg-theme-surface p-5"
    aria-labelledby="review-unresolved-heading"
    data-testid="review-unresolved"
  >
    <h2
      id="review-unresolved-heading"
      class="font-header text-lg font-semibold text-theme-text"
    >
      Unresolved ({draft.unresolved.length})
    </h2>
    <ul class="space-y-2">
      {#each draft.unresolved as item (item.id)}
        <li
          class="flex flex-col gap-1 rounded-lg border border-theme-border bg-theme-bg p-3 text-sm"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs font-semibold text-theme-text">
                {item.code}
              </span>
              {#if item.relatedEntityId}
                <span class="font-mono text-xs text-theme-text">
                  ({item.relatedEntityId})
                </span>
              {/if}
              <AdventureReviewSourceCitation sourceRef={item.sourceRef} />
            </div>
            <AdventureReviewEpistemicBadge status={item.epistemicStatus} />
          </div>
          <p class="text-theme-text">{item.message}</p>
          {#if item.context}
            <p class="text-xs text-theme-text">{item.context}</p>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/if}
