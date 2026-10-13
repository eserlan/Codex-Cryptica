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

{#if def}
  <div class="flex items-start justify-between gap-2">
    <div class="min-w-0">
      <h2
        id="journey-card-title"
        class="text-sm font-bold text-theme-primary font-header"
      >
        {def.title}
      </h2>
      {#if !finished}
        <p class="text-micro uppercase tracking-wider text-theme-muted">
          Step {position.index + 1} of {position.total}
          {#if store.stepDone}· done{/if}
        </p>
      {/if}
    </div>
    <button
      bind:this={expanderEl}
      type="button"
      class="{quiet} flex items-center justify-center"
      aria-expanded="true"
      aria-label="Minimise guided setup"
      data-testid="journey-collapse"
      onclick={onCollapse}
    >
      <span class="icon-[lucide--minus] h-4 w-4" aria-hidden="true"></span>
    </button>
  </div>
{/if}
