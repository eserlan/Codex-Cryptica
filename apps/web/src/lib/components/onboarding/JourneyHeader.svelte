<script lang="ts">
  import type { JourneyStore } from "#lib/app/onboarding/journey/journey-store.svelte.js";

  /** The card's title, position and minimise button. */
  let {
    store,
    onCollapse,
    expanderEl = $bindable(),
  }: {
    store: JourneyStore;
    onCollapse: () => void;
    expanderEl?: HTMLButtonElement;
  } = $props();

  const def = $derived(store.definition);
  const finished = $derived(store.progress?.outcome === "finished");
  const position = $derived(store.position);
</script>

{#snippet progressDots()}
  {#if !finished}
    <div
      class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-theme-bg/50 border border-theme-border/60"
      aria-hidden="true"
    >
      {#each Array(position.total) as _, i}
        <span
          class="h-1.5 rounded-full transition-all {i === position.index
            ? 'w-3.5 bg-theme-primary'
            : i < position.index
              ? 'w-1.5 bg-theme-primary/70'
              : 'w-1.5 bg-theme-muted/40'}"
        ></span>
      {/each}
    </div>
  {/if}
{/snippet}

{#if def}
  <div class="space-y-2">
    <!-- Top row: Badge on left, dots and minimize button neatly grouped on right -->
    <div class="flex items-center justify-between gap-2">
      <span
        class="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-micro font-bold uppercase tracking-wider bg-theme-primary/15 text-theme-text border border-theme-primary/25"
      >
        <span class="icon-[lucide--sparkles] h-3 w-3" aria-hidden="true"></span>
        Cif · Guide
      </span>

      <div class="flex items-center gap-2">
        {@render progressDots()}

        <button
          bind:this={expanderEl}
          type="button"
          class="touch-target min-h-11 min-w-11 rounded-lg flex items-center justify-center text-theme-muted hover:text-theme-primary hover:bg-theme-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
          aria-expanded="true"
          aria-label="Minimise guided setup"
          data-testid="journey-collapse"
          onclick={onCollapse}
        >
          <span class="icon-[lucide--minus] h-4 w-4" aria-hidden="true"></span>
        </button>
      </div>
    </div>

    <!-- Title row: Clean, prominent title -->
    <div>
      <h2
        id="journey-card-title"
        class="text-sm font-bold text-theme-text font-header leading-snug tracking-wide"
      >
        {def.title}
      </h2>
      {#if !finished}
        <p
          class="text-micro font-mono uppercase tracking-widest text-theme-muted mt-0.5"
        >
          Step {position.index + 1} of {position.total}
          {#if store.stepDone}
            · Done{/if}
        </p>
      {/if}
    </div>
  </div>
{/if}
