<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  let { manager }: { manager: AdventureManager } = $props();

  function rollFor(sequence: number) {
    return manager.rollHistory.find((entry) => entry.turn.sequence === sequence)
      ?.resolvedRoll;
  }
</script>

<div class="space-y-5" aria-live="polite" aria-label="Adventure transcript">
  {#if manager.transcript}
    {#each manager.transcript.turns as turn (turn.sequence)}
      {@const roll = rollFor(turn.sequence)}
      <div class="space-y-2">
        <p class="text-sm text-theme-secondary">
          <span class="text-xs uppercase tracking-wide">You</span>
          {turn.playerAction}
        </p>
        <p class="whitespace-pre-wrap text-sm text-theme-primary">
          {turn.narration}
        </p>
        {#if roll}
          <p
            class="inline-flex items-center gap-1.5 rounded-full bg-theme-primary/10 px-2.5 py-1 text-xs text-theme-secondary"
          >
            <span aria-hidden="true" class="icon-[lucide--dices] h-3 w-3"
            ></span>
            {#if roll.expression}{roll.expression} —{/if}
            {roll.outcome.value}
          </p>
        {/if}
      </div>
    {/each}
  {/if}
  {#if manager.phase === "generating"}
    <div
      class="flex items-center gap-2 text-sm text-theme-secondary"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        class="icon-[lucide--loader-2] h-4 w-4 animate-spin"
      ></span>
      Oracle is responding to your action…
    </div>
  {/if}
</div>
