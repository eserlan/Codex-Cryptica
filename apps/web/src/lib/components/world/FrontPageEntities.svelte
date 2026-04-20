<script lang="ts">
  import type { RecentActivity } from "@codex/vault-engine";
  import EntityCard from "./EntityCard.svelte";

  let {
    displayedRecentActivity,
    recentLimit,
    isLoading,
    onRecentLimitChange,
  }: {
    displayedRecentActivity: RecentActivity[];
    recentLimit: number;
    isLoading: boolean;
    onRecentLimitChange: (limit: number) => void;
  } = $props();

  let isEditingRecentLimit = $state(false);
  let recentLimitInput = $state("");

  $effect(() => {
    recentLimitInput = String(recentLimit);
  });

  const beginEditingRecentLimit = () => {
    recentLimitInput = String(recentLimit);
    isEditingRecentLimit = true;
  };

  const commitRecentLimit = async () => {
    const parsed = Number.parseInt(recentLimitInput, 10);
    const nextLimit = Number.isFinite(parsed)
      ? Math.min(24, Math.max(1, parsed))
      : recentLimit;

    recentLimitInput = String(nextLimit);
    isEditingRecentLimit = false;
    onRecentLimitChange(nextLimit);
  };

  const cancelRecentLimitEdit = () => {
    recentLimitInput = String(recentLimit);
    isEditingRecentLimit = false;
  };
</script>

<section
  data-testid="entities-section"
  class="flex flex-1 flex-col rounded-3xl border border-theme-border bg-theme-surface/80 p-4 sm:p-5 md:p-6"
>
  <header class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <h2
        class="font-header text-xs uppercase tracking-[0.22em] text-theme-muted"
      >
        Relevant Entities
      </h2>
      <div class="group relative flex items-center">
        <button
          type="button"
          class="icon-[lucide--info] h-3.5 w-3.5 cursor-help text-theme-muted/60 transition-colors hover:text-theme-primary focus-visible:text-theme-primary focus-visible:outline-none"
          aria-label="About relevant entities"
          aria-describedby="relevant-entities-tooltip"
          title="Entities tagged or labeled with frontpage will be pinned to the top of this section."
        ></button>
        <div
          id="relevant-entities-tooltip"
          role="tooltip"
          class="absolute bottom-full left-0 z-50 mb-2 w-56 translate-y-1 rounded-xl border border-theme-primary/30 bg-theme-surface/95 p-3 text-[10px] leading-relaxed text-theme-text opacity-0 shadow-2xl backdrop-blur-md transition-all duration-200 pointer-events-none group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
        >
          <p>
            Entities tagged or labeled with <strong class="text-theme-primary"
              >frontpage</strong
            > will be pinned to the top of this section.
          </p>
          <div
            class="absolute -top-px -left-px w-2 h-2 border-t border-l border-theme-primary/40 rounded-tl-lg"
          ></div>
          <div
            class="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-theme-primary/40 rounded-br-lg"
          ></div>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2">
      {#if isEditingRecentLimit}
        <input
          bind:value={recentLimitInput}
          type="number"
          min="1"
          max="24"
          inputmode="numeric"
          class="h-10 w-16 rounded-full border border-theme-primary/40 bg-theme-bg/90 px-3 text-center text-sm font-bold text-theme-text outline-none focus:border-theme-primary"
          aria-label="Set recent entities limit"
          onblur={commitRecentLimit}
          onkeydown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitRecentLimit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              cancelRecentLimitEdit();
            }
          }}
        />
      {:else}
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full border border-theme-primary/40 bg-theme-primary/10 text-sm font-bold text-theme-primary hover:bg-theme-primary/20"
          aria-label={`Show ${recentLimit} recent entities`}
          title="Set how many recent entities to show"
          onclick={beginEditingRecentLimit}
        >
          {recentLimit}
        </button>
      {/if}
    </div>
  </header>

  {#if isLoading}
    <div class="py-10 text-center text-sm text-theme-muted">
      Loading front page…
    </div>
  {:else if displayedRecentActivity.length > 0}
    <div class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {#each displayedRecentActivity as activity (activity.id)}
        <EntityCard {activity} />
      {/each}
    </div>
  {:else}
    <div
      class="rounded-2xl border border-dashed border-theme-border px-4 py-10 text-center text-sm text-theme-muted"
    >
      No recent entities yet. Create or import a note to see it here.
    </div>
  {/if}
</section>
