<script lang="ts">
  import { onMount } from "svelte";
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import AdventureNarrativeTurn from "./AdventureNarrativeTurn.svelte";

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
      <AdventureNarrativeTurn {turn} roll={rollFor(turn.sequence)} />
    {/each}
  {/if}
  {#if manager.phase === "generating" && manager.streamedNarration}
    <div class="space-y-2" data-testid="adventure-stream-preview">
      <p class="text-xs text-theme-muted">Oracle is writing…</p>
      <p class="whitespace-pre-wrap text-sm leading-relaxed text-theme-text">
        {manager.streamedNarration}
      </p>
    </div>
  {:else if manager.phase === "generating"}
    <div
      class="flex items-center gap-2 text-sm text-theme-text"
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
