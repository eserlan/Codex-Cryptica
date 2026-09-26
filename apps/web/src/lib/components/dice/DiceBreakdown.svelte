<script lang="ts">
  import DicePartChips from "./DicePartChips.svelte";
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

  const summary = $derived(describeBreakdown(parts, total));
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
        <DicePartChips {part} {maxVisible} />
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
