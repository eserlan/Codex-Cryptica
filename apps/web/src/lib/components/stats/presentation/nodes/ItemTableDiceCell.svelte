<script lang="ts">
  import type { PresentationRenderContext } from "../types";
  import type { ItemTableColumn, ItemTableRow } from "./item-table-values";
  import type { ItemTableRollState } from "./item-table-rolls";
  import DiceBreakdownDisclosure from "#lib/components/dice/DiceBreakdownDisclosure.svelte";
  let {
    row,
    col,
    rIdx,
    context,
    rollState,
    onChange,
    onRoll,
  }: {
    row: ItemTableRow;
    col: ItemTableColumn;
    rIdx: number;
    context: PresentationRenderContext;
    rollState?: ItemTableRollState;
    onChange: (value: string) => void;
    onRoll: (formula: string) => void;
  } = $props();
  const formula = $derived(row[col.id] || col.formula || "1d6");
</script>

{#snippet rollButton()}
  <button
    type="button"
    data-col-id={col.id}
    data-action="roll"
    aria-label={`Roll ${formula} for ${row.name || `item ${rIdx + 1}`}`}
    class="inline-flex max-w-full items-center justify-center gap-1 rounded border border-theme-border/80 bg-theme-bg/60 px-1.5 py-0.5 font-mono text-xs text-theme-primary transition-all hover:border-theme-primary hover:bg-theme-primary/10 disabled:opacity-50"
    disabled={rollState?.rolling}
    onclick={() => onRoll(formula)}
    title="Click to roll {formula}"
  >
    <span class="icon-[lucide--dice-5] h-3 w-3 shrink-0" aria-hidden="true"
    ></span>
    <span class="truncate">{formula}</span>
    {#if rollState?.text}
      <span
        class={rollState.isError
          ? "ml-0.5 font-bold text-red-400"
          : rollState.success === false
            ? "ml-0.5 font-bold text-red-400"
            : "ml-0.5 font-bold text-green-400"}>({rollState.text})</span
      >
    {/if}
  </button>
  <DiceBreakdownDisclosure
    parts={rollState?.roll?.parts}
    total={rollState?.roll?.total ?? 0}
    formula={rollState?.roll?.formula}
  />
{/snippet}

{#if context.mode === "view"}
  {#if !context.readOnly}
    <!-- Each row has its own formula (a longsword and a
                               crossbow differ); the column's is the default. -->
    <input
      type="text"
      data-col-id={col.id}
      data-action="formula"
      aria-label={`${col.label} formula for ${row.name || `item ${rIdx + 1}`}`}
      class="mb-0.5 w-full max-w-[5.5rem] rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-center font-mono text-xs text-theme-text transition-colors focus:border-theme-primary focus:bg-theme-bg focus:outline-none"
      value={formula}
      onchange={(e) =>
        onChange(
          // Cleared: store nothing, so the row follows
          // the column default rather than a copy of it.
          (e.target as HTMLInputElement).value.trim(),
        )}
    />
  {/if}
  {@render rollButton()}
{:else if context.readOnly}
  <span class="font-mono text-xs text-theme-muted">{formula}</span>
{:else}
  <input
    type="text"
    data-col-id={col.id}
    aria-label={`${col.label} formula for item ${rIdx + 1}`}
    class="w-full max-w-[5.5rem] mx-auto rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-center font-mono text-xs text-theme-text transition-colors focus:border-theme-primary focus:bg-theme-bg focus:outline-none"
    value={formula}
    oninput={(e) => onChange((e.target as HTMLInputElement).value)}
  />
{/if}
