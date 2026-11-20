<script lang="ts">
  import type { AdventureJsonV1 } from "@codex/adventure-engine";
  import AdventureReviewSourceCitation from "./AdventureReviewSourceCitation.svelte";
  import AdventureReviewEpistemicBadge from "./AdventureReviewEpistemicBadge.svelte";

  let { draft }: { draft: AdventureJsonV1 } = $props();
</script>

<section
  class="rounded-xl border border-theme-border bg-theme-surface p-5"
  aria-labelledby="review-secrets-heading"
  data-testid="review-secrets"
>
  <details class="group" data-testid="review-secrets-disclosure">
    <summary
      class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text [&::-webkit-details-marker]:hidden"
      data-testid="review-secrets-summary"
    >
      <h2
        id="review-secrets-heading"
        class="font-header text-lg font-semibold text-theme-text"
      >
        Secrets ({draft.secrets.length})
      </h2>
      <span
        class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 text-theme-text transition-transform group-open:rotate-180"
        aria-hidden="true"
      ></span>
    </summary>
    <div class="mt-3 space-y-3 border-t border-theme-border pt-3">
      {#if draft.secrets.length === 0}
        <p class="text-sm text-theme-text">No secrets in this module.</p>
      {:else}
        <ul class="space-y-3">
          {#each draft.secrets as secret, index (secret.id)}
            <li
              class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-mono text-xs text-theme-text"
                    >{secret.id}</span
                  >
                  <AdventureReviewSourceCitation sourceRef={secret.sourceRef} />
                </div>
                <AdventureReviewEpistemicBadge
                  status={secret.epistemicStatus}
                />
              </div>
              <p class="text-sm text-theme-text">{secret.text}</p>
              <div class="flex items-center gap-2 pt-1">
                <span
                  class="inline-flex items-center gap-1 text-xs font-medium text-theme-text"
                  data-testid="secret-classification-{index}"
                >
                  <span
                    class="icon-[lucide--lock] h-3.5 w-3.5"
                    aria-hidden="true"
                  ></span>
                  GM-only (locked)
                </span>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </details>
</section>

{#if draft.endings.length > 0}
  <section
    class="rounded-xl border border-theme-border bg-theme-surface p-5"
    aria-labelledby="review-endings-heading"
    data-testid="review-endings"
  >
    <details class="group" data-testid="review-endings-disclosure">
      <summary
        class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text [&::-webkit-details-marker]:hidden"
        data-testid="review-endings-summary"
      >
        <h2
          id="review-endings-heading"
          class="font-header text-lg font-semibold text-theme-text"
        >
          Endings ({draft.endings.length})
        </h2>
        <span
          class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 text-theme-text transition-transform group-open:rotate-180"
          aria-hidden="true"
        ></span>
      </summary>
      <div class="mt-3 space-y-3 border-t border-theme-border pt-3">
        <ul class="space-y-3">
          {#each draft.endings as ending (ending.id)}
            <li
              class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-theme-text"
                    >{ending.title ?? ending.id}</span
                  >
                  <AdventureReviewSourceCitation sourceRef={ending.sourceRef} />
                </div>
                <AdventureReviewEpistemicBadge
                  status={ending.epistemicStatus}
                />
              </div>
              <p class="text-sm text-theme-text">{ending.description}</p>
            </li>
          {/each}
        </ul>
      </div>
    </details>
  </section>
{/if}
