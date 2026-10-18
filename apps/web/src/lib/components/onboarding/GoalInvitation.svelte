<script lang="ts">
  import { onMount } from "svelte";
  import type { Goal, InvitationChoice } from "onboarding-journey-engine";
  import { enterCard, escapeBelongsToCard, restoreFocus } from "./focus";

  let {
    aiAvailable,
    onChoose,
    onDismiss,
    onTour,
    onClose,
  }: {
    /** Whether Cif and the Oracle can help; the copy never promises AI otherwise. */
    aiAvailable: boolean;
    /** A goal, or "explore". A goal closes the card; explore shows the tour offer. */
    onChoose: (choice: InvitationChoice) => void;
    /** Closed before choosing (Close or Escape). */
    onDismiss: () => void;
    /** "Take the short tour" after exploring. */
    onTour: () => void;
    /** "No thanks" (or Close) after exploring. */
    onClose: () => void;
  } = $props();

  const GOALS: { goal: Goal; label: string; icon: string }[] = [
    { goal: "world", label: "Build a world", icon: "icon-[lucide--globe]" },
    { goal: "story", label: "Write a story", icon: "icon-[lucide--feather]" },
    {
      goal: "campaign",
      label: "Prepare an RPG campaign",
      icon: "icon-[lucide--dices]",
    },
  ];

  let stage = $state<"choose" | "explore">("choose");
  let root = $state<HTMLElement>();
  let heading = $state<HTMLElement>();
  let previousFocus: Element | null = null;
  let announcement = $state("");

  onMount(() => {
    previousFocus = document.activeElement;
    // Never take focus from someone typing (FR-027); announce instead.
    announcement = enterCard(
      heading,
      previousFocus,
      "What would you like to do first? Choices are below.",
    );
  });

  function leave(callback: () => void) {
    restoreFocus(previousFocus);
    callback();
  }

  function choose(goal: Goal) {
    leave(() => onChoose(goal));
  }

  function explore() {
    onChoose("explore");
    stage = "explore";
    queueMicrotask(() => heading?.focus({ preventScroll: true }));
  }

  function close() {
    leave(stage === "choose" ? onDismiss : onClose);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    // Escape belongs to the invitation only when focus is in it, or nowhere.
    if (!escapeBelongsToCard(root)) return;
    event.preventDefault();
    close();
  }

  const choiceClass =
    "touch-target min-h-11 min-w-11 flex w-full items-center gap-3 rounded-lg border border-theme-border px-3 py-2.5 text-left text-sm text-theme-text transition-colors hover:border-theme-primary hover:bg-theme-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary";
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  bind:this={root}
  role="dialog"
  aria-modal="false"
  aria-labelledby="goal-invitation-heading"
  data-testid="goal-invitation"
  class="fixed inset-0 z-[85] flex items-end justify-center pointer-events-none sm:items-center sm:p-4"
>
  <!-- Subtle desktop-only backdrop to separate the choice card from graph nodes behind it -->
  <div
    class="hidden sm:block absolute inset-0 bg-theme-bg/40 backdrop-blur-xs transition-opacity pointer-events-auto"
    onclick={close}
    aria-hidden="true"
  ></div>

  <div
    class="pointer-events-auto relative w-full sm:w-[28rem] rounded-t-2xl sm:rounded-2xl border border-theme-primary/40 bg-theme-surface/98 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl backdrop-blur-md sm:p-5 sm:pb-5"
  >
    <div class="flex items-start justify-between gap-3">
      <h2
        id="goal-invitation-heading"
        bind:this={heading}
        tabindex="-1"
        class="text-sm font-bold text-theme-primary font-header outline-none"
      >
        {stage === "choose"
          ? "What would you like to do first?"
          : "Explore on your own"}
      </h2>
      <button
        type="button"
        class="touch-target min-h-11 min-w-11 flex shrink-0 items-center justify-center rounded-lg text-theme-muted transition-colors hover:text-theme-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary"
        aria-label="Close"
        data-testid="goal-invitation-close"
        onclick={close}
      >
        <span class="icon-[lucide--x] h-5 w-5" aria-hidden="true"></span>
      </button>
    </div>

    {#if stage === "choose"}
      <p class="mt-1 mb-3 text-xs leading-relaxed text-theme-text/80">
        {#if aiAvailable}
          Cif shows you how Codex Cryptica works. The Oracle helps with ideas
          for your world.
        {:else}
          Guided setup walks you through one short task with the app's own
          controls. It works without AI.
        {/if}
      </p>
      <div class="flex flex-col gap-2">
        {#each GOALS as item (item.goal)}
          <button
            type="button"
            class={choiceClass}
            data-testid="goal-invitation-{item.goal}"
            onclick={() => choose(item.goal)}
          >
            <span
              class="{item.icon} h-4 w-4 shrink-0 text-theme-primary"
              aria-hidden="true"
            ></span>
            {item.label}
          </button>
        {/each}
        <button
          type="button"
          class={choiceClass}
          data-testid="goal-invitation-explore"
          onclick={explore}
        >
          <span
            class="icon-[lucide--compass] h-4 w-4 shrink-0 text-theme-muted"
            aria-hidden="true"
          ></span>
          Explore on my own
        </button>
      </div>
    {:else}
      <p class="mt-1 mb-3 text-xs leading-relaxed text-theme-text/80">
        Would you like a short tour of the main screens first? You can start
        guided setup any time from Help → Getting Started.
      </p>
      <div class="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="touch-target min-h-11 min-w-11 rounded-lg px-3 py-1.5 text-xs text-theme-muted transition-colors hover:text-theme-primary"
          data-testid="goal-invitation-no-thanks"
          onclick={() => leave(onClose)}
        >
          No thanks
        </button>
        <button
          type="button"
          class="touch-target min-h-11 min-w-11 rounded-lg bg-theme-primary px-3 py-1.5 text-xs font-bold text-theme-bg transition-opacity hover:opacity-90"
          data-testid="goal-invitation-tour"
          onclick={() => leave(onTour)}
        >
          Take the short tour
        </button>
      </div>
    {/if}
    <p class="sr-only" aria-live="polite">{announcement}</p>
  </div>
</div>
