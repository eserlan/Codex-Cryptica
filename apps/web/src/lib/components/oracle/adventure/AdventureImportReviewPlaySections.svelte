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
      collection: "scenes" | "encounters",
      index: number,
    ) => void;
  } = $props();

  function formatReadAloud(readAloud: string | string[] | undefined): string[] {
    if (!readAloud) return [];
    return Array.isArray(readAloud) ? readAloud : [readAloud];
  }
</script>

<section
  class="rounded-xl border border-theme-border bg-theme-surface p-5"
  aria-labelledby="review-scenes-heading"
  data-testid="review-scenes"
>
  <details class="group" data-testid="review-scenes-disclosure">
    <summary
      class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text [&::-webkit-details-marker]:hidden"
      data-testid="review-scenes-summary"
    >
      <h2
        id="review-scenes-heading"
        class="font-header text-lg font-semibold text-theme-text"
      >
        Scenes ({draft.scenes.length})
      </h2>
      <span
        class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 text-theme-text transition-transform group-open:rotate-180"
        aria-hidden="true"
      ></span>
    </summary>
    <div class="mt-3 space-y-3 border-t border-theme-border pt-3">
      {#if draft.scenes.length === 0}
        <p class="text-sm text-theme-text">No scenes in this module.</p>
      {:else}
        <ul class="space-y-3">
          {#each draft.scenes as scene, index (scene.id)}
            <li
              class="space-y-2 rounded-lg border border-theme-border bg-theme-bg p-4"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-theme-text"
                    >{scene.title}</span
                  >
                  <span class="font-mono text-xs text-theme-text"
                    >{scene.id}</span
                  >
                  <AdventureReviewSourceCitation sourceRef={scene.sourceRef} />
                </div>
                <AdventureReviewEpistemicBadge status={scene.epistemicStatus} />
              </div>
              <p class="text-sm text-theme-text">{scene.summary}</p>
              {#each formatReadAloud(scene.readAloud) as excerpt}
                <blockquote
                  class="border-l-2 border-theme-primary/50 pl-3 text-sm italic text-theme-text"
                >
                  {excerpt}
                </blockquote>
              {/each}
              {#if scene.conditions && scene.conditions.length > 0}
                <p class="text-xs text-theme-text">
                  Conditions: {scene.conditions.join("; ")}
                </p>
              {/if}
              <AdventureReviewVisibilityControl
                collection="scenes"
                {index}
                visibility={scene.visibility}
                label={`scene ${scene.title}`}
                disabled={isLocked}
                onToggle={() => onToggleVisibility("scenes", index)}
              />
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </details>
</section>
