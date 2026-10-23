<script lang="ts">
  import type { Entity } from "schema";
  import type { PresentationRenderContext } from "../types";
  import { formatMoney } from "@codex/stat-sheet-engine";
  import {
    adjustCounterCell,
    getColumnCellClass,
    isTextColumn,
    linkedValue,
    moneyCell,
    parseTableMoney,
    type ItemTableColumn,
    type ItemTableRow,
  } from "./item-table-values";
  import type { ItemTableRollState } from "./item-table-rolls";
  import ItemTableDiceCell from "./ItemTableDiceCell.svelte";
  let {
    row,
    col,
    rIdx,
    linked,
    context,
    rollState,
    onChange,
    onRoll,
  }: {
    row: ItemTableRow;
    col: ItemTableColumn;
    rIdx: number;
    linked?: Entity;
    context: PresentationRenderContext;
    rollState?: ItemTableRollState;
    onChange: (value: any) => void;
    onRoll: (formula: string) => void;
  } = $props();
  const isTextLeft = $derived(isTextColumn(col.id));

  function handleMoneyCell(amount: string, unit: string) {
    if (amount.trim() === "") return onChange("");
    const money = parseTableMoney(amount, unit);
    if (money) onChange(money);
  }
</script>

{#snippet textCell()}
  {@const sourceValue = linkedValue(linked, col.id)}
  {#if context.readOnly || (linked && sourceValue !== undefined)}
    <span
      class={col.type === "number"
        ? "font-mono text-theme-text"
        : "font-medium text-theme-text"}
      >{context.readOnly
        ? (sourceValue ?? row[col.id] ?? "—")
        : sourceValue}</span
    >
  {:else if col.type === "text"}
    <input
      type="text"
      data-col-id={col.id}
      aria-label={`${col.label} for item ${rIdx + 1}`}
      class="w-full rounded border border-theme-border/60 bg-theme-bg/80 px-1.5 py-0.5 {isTextLeft
        ? 'text-left'
        : 'text-center'} text-xs text-theme-text transition-colors focus:border-theme-primary focus:bg-theme-bg focus:outline-none"
      value={row[col.id] ?? ""}
      oninput={(e) => onChange((e.target as HTMLInputElement).value)}
    />
  {:else}
    <input
      type="number"
      data-col-id={col.id}
      aria-label={`${col.label} for item ${rIdx + 1}`}
      class="w-full max-w-[4rem] mx-auto rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-center font-mono text-xs text-theme-text transition-colors focus:border-theme-primary focus:bg-theme-bg focus:outline-none"
      value={row[col.id] ?? 0}
      oninput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
    />
  {/if}
{/snippet}

{#snippet counterCell()}
  {@const val =
    typeof row[col.id] === "object" ? row[col.id]?.value : (row[col.id] ?? 0)}
  {@const max = typeof row[col.id] === "object" ? row[col.id]?.max : undefined}
  {#if context.readOnly}
    <span class="font-mono text-xs text-theme-text">
      {val}{max !== undefined ? ` / ${max}` : ""}
    </span>
  {:else}
    <div class="inline-flex items-center justify-center gap-0.5">
      <button
        type="button"
        data-col-id={col.id}
        data-counter-action="dec"
        aria-label={`Decrease ${col.label} for ${row.name || `item ${rIdx + 1}`}`}
        class="flex h-5 w-5 items-center justify-center rounded text-theme-muted hover:bg-theme-surface/60 hover:text-theme-primary text-xs font-bold disabled:opacity-30"
        onclick={() =>
          onChange(
            adjustCounterCell(row[col.id], -(col.step ?? 1), col.min ?? 0),
          )}
      >
        —
      </button>
      <span class="font-mono text-xs text-theme-text px-0.5">
        {val}{max !== undefined ? ` / ${max}` : ""}
      </span>
      <button
        type="button"
        data-col-id={col.id}
        data-counter-action="inc"
        aria-label={`Increase ${col.label} for ${row.name || `item ${rIdx + 1}`}`}
        class="flex h-5 w-5 items-center justify-center rounded text-theme-muted hover:bg-theme-surface/60 hover:text-theme-primary text-xs font-bold disabled:opacity-30"
        onclick={() =>
          onChange(adjustCounterCell(row[col.id], col.step ?? 1, col.min ?? 0))}
      >
        +
      </button>
    </div>
  {/if}
{/snippet}

{#snippet moneyEditor()}
  {@const money = moneyCell(row, col.id)}
  {#if context.readOnly}
    <span class="font-mono text-theme-text"
      >{money ? formatMoney(money) : "—"}</span
    >
  {:else}
    <div class="inline-flex items-center gap-0.5">
      <input
        type="text"
        inputmode="decimal"
        data-col-id={col.id}
        aria-label={`${col.label} amount for item ${rIdx + 1}`}
        class="w-16 rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-center font-mono text-xs text-theme-text focus:border-theme-primary focus:outline-none"
        value={money ? formatMoney(money, false) : ""}
        onchange={(e) =>
          handleMoneyCell(
            (e.target as HTMLInputElement).value,
            money?.currency ?? "gp",
          )}
      />
      <span class="text-micro text-theme-muted">{money?.currency ?? "gp"}</span>
    </div>
  {/if}
{/snippet}

<td class={getColumnCellClass(col)}>
  {#if col.type === "text" || col.type === "number"}
    {@render textCell()}
  {:else if col.type === "dice"}
    <ItemTableDiceCell
      {row}
      {col}
      {rIdx}
      {context}
      {rollState}
      {onChange}
      {onRoll}
    />
  {:else if col.type === "counter"}
    {@render counterCell()}
  {:else if col.type === "money"}
    {@render moneyEditor()}
  {:else if col.type === "checkbox"}
    <input
      type="checkbox"
      data-col-id={col.id}
      aria-label={`${col.label} for item ${rIdx + 1}`}
      class="h-3.5 w-3.5 rounded border-theme-border text-theme-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
      checked={row[col.id] === true}
      disabled={context.readOnly}
      onchange={(e) => onChange((e.target as HTMLInputElement).checked)}
    />
  {/if}
</td>
