<script lang="ts">
  import type { JourneyStore } from "#lib/app/onboarding/journey/journey-store.svelte.js";

  /** The running step: its instruction and the buttons that act on it. */
  let { store }: { store: JourneyStore } = $props();

  const step = $derived(store.step);
  const position = $derived(store.position);
</script>

{#if step}
  <div class="mt-3 space-y-3">
    <!-- Prompt Instruction -->
    <p
      class="text-xs leading-relaxed text-theme-text/90 bg-theme-bg/30 p-2.5 rounded-lg border border-theme-border/40 font-sans"
      data-testid="journey-step-instruction"
    >
      {store.instruction}
    </p>

    <!-- Action Buttons -->
    <div class="flex flex-col gap-2">
      {#if step.showMe && !store.showingFallback && !store.stepDone}
        <button
          type="button"
          class="touch-target min-h-11 w-full flex items-center justify-center gap-2 rounded-lg bg-theme-primary px-4 py-2 text-xs font-bold text-theme-bg shadow-sm transition-all hover:opacity-95 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
          data-testid="journey-show-me"
          onclick={() => void store.showMe()}
        >
          <span class="icon-[lucide--sparkles] h-4 w-4" aria-hidden="true"
          ></span>
          Show me
        </button>
      {/if}
      {#if store.canAskCif && !store.stepDone}
        <button
          type="button"
          class="touch-target min-h-11 w-full flex items-center justify-center gap-2 rounded-lg border border-theme-primary/50 bg-theme-primary/5 px-4 py-2 text-xs font-semibold text-theme-primary transition-colors hover:bg-theme-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
          data-testid="journey-ask-cif"
          onclick={() => store.askCif()}
        >
          <span class="icon-[lucide--message-square] h-4 w-4" aria-hidden="true"
          ></span>
          Ask Cif
        </button>
      {/if}
      {#if store.viewingEarlier}
        <button
          type="button"
          class="touch-target min-h-11 w-full flex items-center justify-center gap-2 rounded-lg border border-theme-primary/50 bg-theme-primary/5 px-4 py-2 text-xs font-semibold text-theme-primary transition-colors hover:bg-theme-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
          data-testid="journey-return-current"
          onclick={() => store.returnToCurrent()}
        >
          <span class="icon-[lucide--arrow-right] h-4 w-4" aria-hidden="true"
          ></span>
          Back to current step
        </button>
      {/if}
    </div>

    <!-- Footer Controls -->
    <div
      class="flex items-center justify-between gap-1 border-t border-theme-border/50 pt-2 text-micro"
    >
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="touch-target min-h-11 min-w-11 px-2.5 rounded-md flex items-center justify-center text-theme-muted hover:text-theme-primary hover:bg-theme-primary/5 transition-colors disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
          data-testid="journey-back"
          disabled={position.index === 0}
          onclick={() => store.back()}
        >
          ‹ Back
        </button>
        {#if !store.stepDone}
          <button
            type="button"
            class="touch-target min-h-11 min-w-11 px-2.5 rounded-md flex items-center justify-center text-theme-muted hover:text-theme-primary hover:bg-theme-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
            data-testid="journey-skip"
            onclick={() => store.skip()}
          >
            Skip ›
          </button>
        {/if}
      </div>
      <button
        type="button"
        class="touch-target min-h-11 min-w-11 px-2 rounded-md flex items-center justify-center text-theme-muted/80 hover:text-theme-danger hover:bg-theme-danger/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
        data-testid="journey-exit"
        onclick={() => store.exit()}
      >
        Stop guided setup
      </button>
    </div>
  </div>
{/if}
