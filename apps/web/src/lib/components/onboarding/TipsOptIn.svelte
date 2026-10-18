<script lang="ts">
  import { onMount } from "svelte";
  import { enterCard, escapeBelongsToCard, restoreFocus } from "./focus";

  /**
   * The one-time question after guided setup (spec 176, FR-006). It makes no
   * request, never takes focus from someone typing, and is never shown again
   * after any answer or close.
   */
  let {
    onYes,
    onNo,
  }: {
    onYes: () => void;
    /** Used for No and for closing the card. */
    onNo: () => void;
  } = $props();

  let root = $state<HTMLElement>();
  let heading = $state<HTMLElement>();
  let previousFocus: Element | null = null;
  let announcement = $state("");

  onMount(() => {
    previousFocus = document.activeElement;
    announcement = enterCard(
      heading,
      previousFocus,
      "Want occasional tips from Cif? Choices are below.",
    );
  });

  function leave(callback: () => void) {
    restoreFocus(previousFocus);
    callback();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    // Escape belongs to this card only when focus is inside it, or nowhere.
    if (!escapeBelongsToCard(root)) return;
    event.preventDefault();
    leave(onNo);
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  bind:this={root}
  role="region"
  aria-labelledby="tips-opt-in-heading"
  data-testid="tips-opt-in"
  class="fixed inset-x-0 bottom-0 z-[85] sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:w-[24rem] sm:-translate-x-1/2"
>
  <div
    class="rounded-t-2xl border border-theme-primary/40 bg-theme-surface/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl backdrop-blur-md sm:rounded-2xl sm:pb-4"
  >
    <div class="flex items-start justify-between gap-3">
      <h2
        id="tips-opt-in-heading"
        bind:this={heading}
        tabindex="-1"
        class="text-sm font-bold text-theme-primary font-header outline-none"
      >
        Want occasional tips from Cif?
      </h2>
      <button
        type="button"
        class="touch-target min-h-11 min-w-11 flex shrink-0 items-center justify-center rounded-lg text-theme-muted transition-colors hover:text-theme-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
        aria-label="Close"
        data-testid="tips-opt-in-close"
        onclick={() => leave(onNo)}
      >
        <span class="icon-[lucide--x] h-5 w-5" aria-hidden="true"></span>
      </button>
    </div>
    <p class="mt-1 mb-3 text-xs leading-relaxed text-theme-text/80">
      Cif can suggest one thing to try next, once per visit, based on the goal
      you chose. Nothing is sent until you tap a tip, and Cif never reads your
      vault. You can change this in Settings.
    </p>
    <div class="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        class="touch-target min-h-11 min-w-11 rounded-lg px-3 py-1.5 text-xs text-theme-muted transition-colors hover:text-theme-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
        data-testid="tips-opt-in-no"
        onclick={() => leave(onNo)}
      >
        No thanks
      </button>
      <button
        type="button"
        class="touch-target min-h-11 min-w-11 rounded-lg bg-theme-primary px-3 py-1.5 text-xs font-bold text-theme-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
        data-testid="tips-opt-in-yes"
        onclick={() => leave(onYes)}
      >
        Yes, show tips
      </button>
    </div>
    <p class="sr-only" aria-live="polite">{announcement}</p>
  </div>
</div>
