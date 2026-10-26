<script lang="ts">
  import type { JourneyStore } from "#lib/app/onboarding/journey/journey-store.svelte.js";

  /** The finish state of the journey card: what was done, one suggestion, Done. */
  let { store }: { store: JourneyStore } = $props();

  const def = $derived(store.definition);

  const button =
    "min-h-11 min-w-11 rounded-lg px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary";
  const primary = `${button} bg-theme-primary font-bold text-theme-bg hover:opacity-90`;
  const outline = `${button} border border-theme-primary/40 text-theme-primary hover:bg-theme-primary/10`;
</script>

{#if def}
  <p
    class="mt-2 text-xs leading-relaxed text-theme-text/90"
    data-testid="journey-finish"
  >
    {def.finish.message}
  </p>
  <div class="mt-3 flex flex-wrap justify-end gap-2">
    {#if def.finish.next}
      <button
        type="button"
        class={outline}
        data-testid="journey-next"
        onclick={() => void store.runNext()}
      >
        {def.finish.next.label}
      </button>
    {/if}
    <button
      type="button"
      class={primary}
      data-testid="journey-done"
      onclick={() => store.done()}
    >
      Done
    </button>
  </div>
{/if}
