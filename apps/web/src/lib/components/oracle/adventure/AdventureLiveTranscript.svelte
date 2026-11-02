<script lang="ts">
  import { onMount } from "svelte";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import DiceBreakdownDisclosure from "#lib/components/dice/DiceBreakdownDisclosure.svelte";

  let { manager }: { manager: AdventureManager } = $props();

  const generationMessages = [
    "The Oracle traces the threads of consequence…",
    "Fate gathers around your choice…",
    "The world shifts in answer to your action…",
    "The next turn of the tale is taking shape…",
  ];
  let generationMessageIndex = $state(0);
  let generationMessage = $derived(generationMessages[generationMessageIndex]!);

  onMount(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => {
      generationMessageIndex =
        (generationMessageIndex + 1) % generationMessages.length;
    }, 2_800);
    return () => window.clearInterval(interval);
  });

  function rollFor(sequence: number) {
    return manager.rollHistory.find((entry) => entry.turn.sequence === sequence)
      ?.resolvedRoll;
  }
</script>

<div
  class="space-y-5"
  aria-live="polite"
  aria-label="Adventure transcript"
  data-testid="adventure-narrative"
>
  {#if manager.transcript}
    {#each manager.transcript.turns as turn (turn.sequence)}
      {@const roll = rollFor(turn.sequence)}
      <article class="space-y-3 border-b border-theme-border/40 pb-5 last:border-0">
        {#if turn.playerAction.trim()}
          <div
            class="ml-auto max-w-[90%] rounded-2xl rounded-br-sm bg-theme-primary/10 px-3 py-2"
          >
            <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-theme-secondary">
              You
            </p>
            <p class="whitespace-pre-wrap text-sm leading-relaxed text-theme-primary">
              {turn.playerAction}
            </p>
          </div>
        {/if}
        <div class="space-y-1">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-theme-secondary">
            Oracle
          </p>
          <p class="whitespace-pre-wrap text-[15px] leading-7 text-theme-primary">
            {turn.narration}
          </p>
        </div>
        {#if roll}
          <p
            class="inline-flex items-center gap-1.5 rounded-full bg-theme-primary/10 px-2.5 py-1 text-xs text-theme-secondary"
          >
            <span aria-hidden="true" class="icon-[lucide--dices] h-3 w-3"></span>
            {#if roll.expression}{roll.expression} —{/if}
            {roll.outcome.value}
          </p>
          <DiceBreakdownDisclosure
            parts={roll.outcome.parts}
            total={typeof roll.outcome.value === "number"
              ? roll.outcome.value
              : 0}
            formula={roll.expression}
          />
        {/if}
      </article>
    {/each}
  {/if}
  {#if manager.phase === "generating"}
    <div
      class="flex items-center gap-2 text-sm text-theme-secondary"
      role="status"
      aria-live="off"
      data-testid="adventure-generating-status"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--sparkles] h-4 w-4 motion-safe:animate-pulse"
      ></span>
      <span>{generationMessage}</span>
    </div>
  {/if}
</div>
