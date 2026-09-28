<script lang="ts">
  import { COMMUNITY_QUORUM } from "$lib/services/community/community-aggregates";
  import { base } from "$app/paths";

  /** A community-validated answer, with display copy resolved by the parent. */
  export interface CommunityFavourite {
    slug: string;
    question: string;
    shortAnswer: string;
    /** Category/kind line, e.g. "Heists · Framework". */
    meta: string;
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
            class="-mx-2 block rounded-lg px-2 py-3 transition-colors hover:bg-theme-surface/40"
          >
            <span class="flex items-start justify-between gap-4">
              <span class="flex-1">
                <span
                  class="mb-1 block font-mono text-[11px] uppercase tracking-wider text-theme-muted"
                >
                  {favourite.meta} &bull; {favourite.yes} readers found this helpful
                </span>
                <span
                  class="block font-header text-base font-bold text-theme-text transition-colors group-hover:text-theme-primary"
                >
                  {favourite.question}
                </span>
                <span
                  class="mt-1 line-clamp-2 block text-sm leading-relaxed text-theme-muted"
                >
                  {favourite.shortAnswer}
                </span>
              </span>
              <span
                class="icon-[lucide--arrow-right] mt-1 h-4 w-4 shrink-0 text-theme-muted transition-all group-hover:translate-x-1 group-hover:text-theme-primary"
                aria-hidden="true"
              ></span>
            </span>
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/if}
