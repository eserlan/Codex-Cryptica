<script lang="ts">
  import { getDiceIcon } from "$lib/utils/dice-icons";
  import {
    describeBreakdown,
    formatModifier,
    type DiceBreakdownPart,
  } from "$lib/utils/dice-breakdown";

  /**
   * The shared "how was this rolled" view (#3443). It only renders the trace
   * it is given: it never rolls, parses or reconstructs anything, so showing
   * it can never change a result.
   */
  let {
    parts,
    total,
    formula,
    maxVisible = 12,
    showFormula = true,
    showTotal = true,
    framed = true,
  }: {
    parts: DiceBreakdownPart[];
    total: number;
    formula?: string;
    /** Pools larger than this fold behind a "+N more" toggle. */
    maxVisible?: number;
    /** Hosts that already show the formula or total themselves turn these off. */
    showFormula?: boolean;
    showTotal?: boolean;
    /** Draws the bordered panel; off when the host supplies its own frame. */
    framed?: boolean;
  } = $props();

  let showAll = $state(false);

  const summary = $derived(describeBreakdown(parts, total));
  const isMax = (roll: number, sides?: number) =>
    sides !== undefined && sides > 1 && roll === sides;
  const isMin = (roll: number, sides?: number) =>
    sides !== undefined && sides > 1 && roll === 1;
</script>

<div
  class="flex flex-col gap-2 {framed
    ? 'rounded-lg border border-theme-border/40 bg-theme-bg/40 p-2.5'
    : ''}"
  data-testid="dice-breakdown"
  role="group"
  aria-label="Roll breakdown"
>
  {#if formula && showFormula}
    <span
      class="w-fit rounded border border-theme-primary/20 bg-theme-primary/10 px-2 py-0.5 font-header text-xs text-theme-text"
      data-testid="dice-breakdown-formula">{formula}</span
    >
  {/if}

  <span class="sr-only">{summary}</span>

  <div class="flex flex-col gap-1.5" aria-hidden="true">
    {#each parts as part, i (i)}
      {#if part.type === "dice"}
        {@const rolls = part.rolls ?? []}
        {@const visible = showAll ? rolls : rolls.slice(0, maxVisible)}
        {@const hidden = rolls.length - visible.length}
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="{getDiceIcon(part.sides)} h-3.5 w-3.5 text-theme-muted"
          ></span>
          {#each visible as roll, j (j)}
            <span
              class="flex h-7 min-w-7 items-center justify-center rounded border border-theme-border bg-theme-bg px-1 font-header text-xs font-bold tabular-nums {isMax(
                roll,
                part.sides,
              )
                ? 'text-theme-primary'
                : isMin(roll, part.sides)
                  ? 'text-red-500'
                  : 'text-theme-text'}"
              data-testid="dice-kept">{roll}</span
            >
          {/each}
          {#if hidden > 0}
            <button
              type="button"
              class="rounded border border-theme-border bg-theme-bg px-2 py-1 text-[10px] font-bold text-theme-muted transition-colors hover:text-theme-primary"
              onclick={() => (showAll = true)}>+{hidden} more</button
            >
          {:else if showAll && rolls.length > maxVisible}
            <button
              type="button"
              class="rounded border border-theme-border bg-theme-bg px-2 py-1 text-[10px] font-bold text-theme-muted transition-colors hover:text-theme-primary"
              onclick={() => (showAll = false)}>Show less</button
            >
          {/if}
          {#each part.dropped ?? [] as dropped, k (k)}
            <span
              class="flex h-7 min-w-7 items-center justify-center rounded border border-dashed border-theme-border/60 px-1 font-header text-xs tabular-nums text-theme-muted line-through"
              data-testid="dice-dropped">{dropped}</span
            >
          {/each}
        </div>
      {:else}
        <span
          class="w-fit rounded border border-theme-border/40 px-2 py-0.5 font-header text-xs font-bold text-theme-muted"
          data-testid="dice-modifier">{formatModifier(part.value)}</span
        >
      {/if}
    {/each}
  </div>

  {#if showTotal}
    <div
      class="flex items-baseline gap-1.5 border-t border-theme-border/30 pt-1.5 font-header text-xs text-theme-muted"
      aria-hidden="true"
    >
      <span class="uppercase tracking-widest">Total</span>
      <span
        class="text-sm font-bold tabular-nums text-theme-primary"
        data-testid="dice-breakdown-total">{total}</span
      >
    </div>
  {/if}
</div>
