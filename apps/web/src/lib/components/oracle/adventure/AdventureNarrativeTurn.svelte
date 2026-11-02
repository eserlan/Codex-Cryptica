<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  import DiceBreakdownDisclosure from "#lib/components/dice/DiceBreakdownDisclosure.svelte";

  let {
    turn,
    roll,
  }: {
    turn: NonNullable<AdventureManager["transcript"]>["turns"][number];
    roll?: AdventureManager["rollHistory"][number]["resolvedRoll"];
  } = $props();
</script>

<article class="space-y-3 border-b border-theme-border/40 pb-5 last:border-0">
  {#if turn.playerAction.trim()}
    <div
      class="ml-auto max-w-[90%] rounded-2xl rounded-br-sm bg-theme-primary/10 px-3 py-2"
    >
      <p
        class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-theme-text"
      >
        You
      </p>
      <p class="whitespace-pre-wrap text-sm leading-relaxed text-theme-text">
        {turn.playerAction}
      </p>
    </div>
  {/if}
  <div class="space-y-1">
    <p
      class="text-[11px] font-semibold uppercase tracking-wide text-theme-text"
    >
      Oracle
    </p>
    <p class="whitespace-pre-wrap text-[15px] leading-7 text-theme-text">
      {turn.narration}
    </p>
  </div>
  {#if roll}
    <p
      class="inline-flex items-center gap-1.5 rounded-full bg-theme-primary/10 px-2.5 py-1 text-xs text-theme-text"
    >
      <span aria-hidden="true" class="icon-[lucide--dices] h-3 w-3"></span>
      {#if roll.expression}{roll.expression} —{/if}
      {roll.outcome.value}
    </p>
    <DiceBreakdownDisclosure
      parts={roll.outcome.parts}
      total={typeof roll.outcome.value === "number" ? roll.outcome.value : 0}
      formula={roll.expression}
    />
  {/if}
</article>
