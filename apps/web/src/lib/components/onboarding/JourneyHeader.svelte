<script lang="ts">
  import type { JourneyStore } from "$lib/app/onboarding/journey/journey-store.svelte";

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

  const quiet =
    "min-h-11 min-w-11 rounded-lg px-3 py-1.5 text-xs transition-colors text-theme-muted hover:text-theme-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary";
</script>

{#snippet progressDots()}
  {#if !finished}
    <div class="flex items-center gap-1 ml-auto mr-1" aria-hidden="true">
      {#each Array(position.total) as _, i}
        <span
          class="h-1.5 rounded-full transition-all {i === position.index
            ? 'w-3 bg-theme-primary'
            : i < position.index
              ? 'w-1.5 bg-theme-primary/60'
              : 'w-1.5 bg-theme-muted/40'}"
        ></span>
      {/each}
    </div>
  {/if}
{/snippet}

{#if def}
  <div class="flex items-start justify-between gap-2">
    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-1.5 mb-1">
        <span
          class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-micro font-bold uppercase tracking-wider bg-theme-primary/15 text-theme-text"
        >
          <span class="icon-[lucide--sparkles] h-3 w-3" aria-hidden="true"
          ></span>
          Cif · Guide
        </span>
        {@render progressDots()}
      </div>
      <h2
        id="journey-card-title"
        class="text-sm font-bold text-theme-text font-header leading-tight"
      >
        {def.title}
      </h2>
      {#if !finished}
        <p class="text-micro uppercase tracking-wider text-theme-muted mt-0.5">
          Step {position.index + 1} of {position.total}
          {#if store.stepDone}· done{/if}
        </p>
      {/if}
    </div>
    <button
      bind:this={expanderEl}
      type="button"
      class="{quiet} flex items-center justify-center shrink-0 -mr-1 -mt-1"
      aria-expanded="true"
      aria-label="Minimise guided setup"
      data-testid="journey-collapse"
      onclick={onCollapse}
    >
      <span class="icon-[lucide--minus] h-4 w-4" aria-hidden="true"></span>
    </button>
  </div>
{/if}
