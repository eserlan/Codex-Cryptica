<script lang="ts">
  import { COMMUNITY_QUORUM } from "$lib/services/community/community-aggregates";
  import { formatAnswerDate } from "$lib/content/answers/sort";
  import { base } from "$app/paths";

  /**
   * A community-validated answer. Rows deliberately share the standard
   * answer-row anatomy used across /answers (kind · category · date /
   * title / summary / arrow) — the section frame and the trailing
   * helpfulness count are the only differentiators.
   */
  export interface CommunityFavourite {
    slug: string;
    question: string;
    shortAnswer: string;
    kindLabel: string;
    categoryTitle: string;
    publishedAt?: string;
    yes: number;
  }

  let { favourites }: { favourites: CommunityFavourite[] } = $props();

  const cleanBase = base === "/" ? "" : base;
  // Quorum is enforced here as well as at fetch time (defence in depth):
  // a thin community signal must never render as a one-item strip.
  let visible = $derived(favourites.length >= COMMUNITY_QUORUM);
</script>

{#if visible}
  <section
    aria-labelledby="community-favourites-heading"
    class="mb-10 rounded-xl border border-theme-border/80 bg-theme-surface/50 p-5 sm:p-6"
  >
    <div class="mb-1 flex items-center gap-2 text-theme-primary">
      <span class="icon-[lucide--trending-up] h-4 w-4" aria-hidden="true"
      ></span>
      <h2
        id="community-favourites-heading"
        class="font-header text-lg font-bold tracking-tight text-theme-text sm:text-xl"
      >
        Community favourites
      </h2>
    </div>
    <p class="mb-4 text-sm leading-relaxed text-theme-muted">
      The answers readers marked most helpful.
    </p>
    <ul class="flex list-none flex-col divide-y divide-theme-border/60">
      {#each favourites as favourite (favourite.slug)}
        <li class="group">
          <a
            href="{cleanBase}/answers/{favourite.slug}"
            class="-mx-2 block rounded-lg px-2 py-4 transition-colors hover:bg-theme-surface/40"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="mb-1.5 flex flex-wrap items-center gap-2">
                  <span
                    class="font-mono text-meta uppercase tracking-wider text-theme-primary"
                  >
                    {favourite.kindLabel}
                  </span>
                  <span class="text-theme-muted/40">&bull;</span>
                  <span class="font-mono text-meta text-theme-muted">
                    {favourite.categoryTitle}
                  </span>
                  {#if favourite.publishedAt}
                    <span class="text-theme-muted/40">&bull;</span>
                    <time
                      datetime={favourite.publishedAt}
                      class="font-mono text-meta text-theme-muted"
                    >
                      {formatAnswerDate(favourite.publishedAt)}
                    </time>
                  {/if}
                  <span class="text-theme-muted/40">&bull;</span>
                  <span class="font-mono text-meta text-theme-muted">
                    {favourite.yes} readers found this helpful
                  </span>
                </div>
                <h3
                  class="font-header text-lg font-bold text-theme-text transition-colors group-hover:text-theme-primary sm:text-xl"
                >
                  {favourite.question}
                </h3>
                <p
                  class="mt-1.5 line-clamp-2 text-base leading-relaxed text-theme-muted"
                >
                  {favourite.shortAnswer}
                </p>
              </div>
              <span
                class="icon-[lucide--arrow-right] mt-2 h-4 w-4 shrink-0 text-theme-muted transition-all group-hover:translate-x-1 group-hover:text-theme-primary"
                aria-hidden="true"
              ></span>
            </div>
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/if}
