<script lang="ts">
  import type { Goal } from "onboarding-journey-engine";
  import { journeyStore } from "#lib/app/onboarding/journey/journey-runtime.js";
  import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";

  /**
   * Guided setup inside Help → Getting Started (spec 175, FR-025): start a
   * goal's journey, continue it, or start it over. Help closes so the card and
   * its highlights are visible.
   */
  const GOALS: { goal: Goal; label: string }[] = [
    { goal: "world", label: "Build a world" },
    { goal: "story", label: "Write a story" },
    { goal: "campaign", label: "Prepare an RPG campaign" },
  ];

  // Help closes so the journey card and its highlights can be seen.
  function startGuide(run: () => void) {
    run();
    modalUIStore.closeSettings();
  }

  const guideButton =
    "min-h-11 rounded border border-theme-border px-3 py-1.5 text-xs text-theme-text transition-colors hover:border-theme-primary hover:bg-theme-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary";
</script>

<div class="mb-4" data-testid="guided-setup">
  <h4 class="mb-1 text-xs font-bold text-theme-text">Guided setup</h4>
  <p class="mb-2 text-xs text-theme-text/70">
    One short task, step by step, using the app's own controls. Works without
    AI.
  </p>
  {#if journeyStore.definition}
    <div class="mb-2 flex flex-wrap gap-2">
      {#if journeyStore.canContinue}
        <button
          type="button"
          class="{guideButton} border-theme-primary/40 text-theme-primary"
          data-testid="guided-setup-continue"
          onclick={() => startGuide(() => journeyStore.resume())}
        >
          Continue: {journeyStore.definition.title}
        </button>
      {/if}
      <button
        type="button"
        class={guideButton}
        data-testid="guided-setup-start-over"
        onclick={() => startGuide(() => journeyStore.startOver())}
      >
        Start “{journeyStore.definition.title}” over
      </button>
    </div>
  {/if}
  <div class="flex flex-wrap gap-2">
    {#each GOALS as item (item.goal)}
      <button
        type="button"
        class={guideButton}
        data-testid="guided-setup-{item.goal}"
        onclick={() => startGuide(() => journeyStore.start(item.goal))}
      >
        {item.label}
      </button>
    {/each}
  </div>
</div>
