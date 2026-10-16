<script lang="ts">
  import type { JourneyStore } from "$lib/app/onboarding/journey/journey-store.svelte";

  /** The running step: its instruction and the buttons that act on it. */
  let { store }: { store: JourneyStore } = $props();

  const step = $derived(store.step);
  const position = $derived(store.position);

  const button =
    "min-h-11 min-w-11 rounded-lg px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary disabled:opacity-40 disabled:cursor-not-allowed";
  const quiet = `${button} text-theme-muted hover:text-theme-primary`;
  const primary = `${button} bg-theme-primary font-bold text-theme-bg hover:opacity-90`;
  const outline = `${button} border border-theme-primary/40 text-theme-primary hover:bg-theme-primary/10`;
</script>

{#if step}
  <p
    class="mt-2 text-xs leading-relaxed text-theme-text/90"
    data-testid="journey-step-instruction"
  >
    {store.instruction}
  </p>
  <div class="mt-3 flex flex-wrap gap-2">
    {#if step.showMe && !store.showingFallback && !store.stepDone}
      <button
        type="button"
        class="{primary} inline-flex items-center gap-1.5"
        data-testid="journey-show-me"
        onclick={() => void store.showMe()}
      >
        <span class="icon-[lucide--sparkles] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Show me
      </button>
    {/if}
    {#if store.canAskCif && !store.stepDone}
      <button
        type="button"
        class="{outline} inline-flex items-center gap-1.5"
        data-testid="journey-ask-cif"
        onclick={() => store.askCif()}
      >
        <span
          class="icon-[lucide--message-square] h-3.5 w-3.5"
          aria-hidden="true"
        ></span>
        Ask Cif
      </button>
    {/if}
    {#if store.viewingEarlier}
      <button
        type="button"
        class="{outline} inline-flex items-center gap-1.5"
        data-testid="journey-return-current"
        onclick={() => store.returnToCurrent()}
      >
        <span class="icon-[lucide--arrow-right] h-3.5 w-3.5" aria-hidden="true"
        ></span>
        Back to current step
      </button>
    {/if}
  </div>
  <div
    class="mt-2 flex flex-wrap items-center justify-between gap-1 border-t border-theme-border pt-2"
  >
    <div class="flex gap-1">
      <button
        type="button"
        class={quiet}
        data-testid="journey-back"
        disabled={position.index === 0}
        onclick={() => store.back()}
      >
        Back
      </button>
      {#if !store.stepDone}
        <button
          type="button"
          class={quiet}
          data-testid="journey-skip"
          onclick={() => store.skip()}
        >
          Skip
        </button>
      {/if}
    </div>
    <button
      type="button"
      class={quiet}
      data-testid="journey-exit"
      onclick={() => store.exit()}
    >
      Stop guided setup
    </button>
  </div>
{/if}
