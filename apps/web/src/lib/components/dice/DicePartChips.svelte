<script lang="ts">
  import { getDiceIcon } from "$lib/utils/dice-icons";
  import type { DiceBreakdownPart } from "$lib/utils/dice-breakdown";

  /** One dice group of a breakdown: kept dice, then any dropped dice. */
  let {
    part,
    maxVisible = 12,
  }: { part: DiceBreakdownPart; maxVisible?: number } = $props();

  let showAll = $state(false);

  const rolls = $derived(part.rolls ?? []);
  const visible = $derived(showAll ? rolls : rolls.slice(0, maxVisible));
  const hidden = $derived(rolls.length - visible.length);
  const canCollapse = $derived(showAll && rolls.length > maxVisible);

  const isMax = (roll: number) =>
    part.sides !== undefined && part.sides > 1 && roll === part.sides;
  const isMin = (roll: number) =>
    part.sides !== undefined && part.sides > 1 && roll === 1;
  const tone = (roll: number) =>
    isMax(roll)
      ? "text-theme-primary"
      : isMin(roll)
        ? "text-red-500"
        : "text-theme-text";
</script>

<div class="flex flex-wrap items-center gap-1.5">
  <span class="{getDiceIcon(part.sides)} h-3.5 w-3.5 text-theme-muted"></span>
  {#each visible as roll, j (j)}
    <span
      class="flex h-7 min-w-7 items-center justify-center rounded border border-theme-border bg-theme-bg px-1 font-header text-xs font-bold tabular-nums {tone(
        roll,
      )}"
      data-testid="dice-kept">{roll}</span
    >
  {/each}
  {#if hidden > 0 || canCollapse}
    <button
      type="button"
      class="rounded border border-theme-border bg-theme-bg px-2 py-1 text-[10px] font-bold text-theme-muted transition-colors hover:text-theme-primary"
      onclick={() => (showAll = !showAll)}
      >{hidden > 0 ? `+${hidden} more` : "Show less"}</button
    >
  {/if}
  {#each part.dropped ?? [] as dropped, k (k)}
    <span
      class="flex h-7 min-w-7 items-center justify-center rounded border border-dashed border-theme-border/60 px-1 font-header text-xs tabular-nums text-theme-muted line-through"
      data-testid="dice-dropped">{dropped}</span
    >
  {/each}
</div>
