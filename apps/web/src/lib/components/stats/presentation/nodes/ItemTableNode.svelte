<script lang="ts">
  import { tick } from "svelte";
  import ItemTableCell from "./ItemTableCell.svelte";
  import ItemTableToolbar from "./ItemTableToolbar.svelte";
  import ItemTableRowActions from "./ItemTableRowActions.svelte";
  import {
    rollItemTableDice,
    type ItemTableRollState,
  } from "./item-table-rolls";
  import {
    defaultCellValue,
    getColumnHeaderClass,
    type ItemTableRow,
  } from "./item-table-values";
  import {
    captureRowFocus,
    restoreRowFocus,
    rowMoveDirection,
  } from "./item-table-focus";
  import {
    DEFAULT_ITEM_TABLE_COLUMNS,
    type Entity,
    type StatSheetField,
  } from "schema";
  import type { PresentationRenderContext } from "../types";
  import { ensureRowIds, patchStock } from "@codex/stat-sheet-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import ItemTableStockRow from "./ItemTableStockRow.svelte";
  import StockTradePanel from "./StockTradePanel.svelte";

  let {
    field,
    context,
    catalogue = false,
  }: {
    field: StatSheetField;
    context: PresentationRenderContext;
    /** Customer-facing read-only view (#3962): hides hidden lines and GM
     * notes. A presentation choice only, not access control. */
    catalogue?: boolean;
  } = $props();

  let tableContainer: HTMLDivElement | undefined = $state();

  const columns = $derived(field.columns ?? DEFAULT_ITEM_TABLE_COLUMNS);

  let rows = $derived<Record<string, any>[]>(field.rows ?? []);
  const hasVisibleRows = $derived(
    rows.some((row) => !catalogue || row.stock?.availability !== "hidden"),
  );

  // Merchant stock ledger mode (#3961): stable row ids + shop-local stock.
  const stockEnabled = $derived(field.stockLedger === true);
  let stockNotice = $state("");
  // GM-only shop controls (#3963 trading, #3964 sharing) show on an
  // editable ledger with a known owner entity, never to players.
  // The stock line whose trade form is open (#3963). One at a time.
  let tradeRowId = $state<string | null>(null);
  const tradingEnabled = $derived(
    stockEnabled &&
      !catalogue &&
      !context.readOnly &&
      context.mode === "view" &&
      !!context.entityId,
  );

  let rollStateMap = $state<Record<string, ItemTableRollState>>({});

  function linkedEntity(row: Record<string, any>) {
    const entityId = row.entityId;
    return typeof entityId === "string" ? vault.entities[entityId] : undefined;
  }

  function updateRows(nextRows: Record<string, any>[]) {
    context.onUpdateField(field.id, {
      rows: stockEnabled ? ensureRowIds(nextRows) : nextRows,
    });
  }

  // Legacy rows gain ids the first time an editor opens a stock ledger.
  $effect(() => {
    if (!stockEnabled || context.readOnly) return;
    if (ensureRowIds(rows) !== rows) updateRows(rows);
  });

  function rowKey(row: Record<string, any>, index: number): string {
    return stockEnabled && typeof row.rowId === "string" && row.rowId
      ? row.rowId
      : `idx-${index}`;
  }

  const defaultStock = () => ({
    kind: "item" as const,
    quantity: 1,
    availability: "available" as const,
  });

  function handleStockPatch(rowIndex: number, patch: Record<string, any>) {
    updateRows(rows.map((r, i) => (i === rowIndex ? patchStock(r, patch) : r)));
  }

  function handleAddRow() {
    const newRow: Record<string, any> = {};
    for (const col of columns) newRow[col.id] = defaultCellValue(col);
    if (stockEnabled) newRow.stock = defaultStock();
    updateRows([...rows, newRow]);
  }

  function handleLinkItem(entityId: string) {
    if (!entityId) return;
    updateRows([
      ...rows,
      stockEnabled ? { entityId, stock: defaultStock() } : { entityId },
    ]);
  }

  function handleMoveRow(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= rows.length) return;
    const focus = captureRowFocus(tableContainer, index, targetIndex);
    const next = [...rows];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    updateRows(next);
    if (focus) {
      const restoreFocus = () => restoreRowFocus(tableContainer, focus);
      void tick().then(() => {
        restoreFocus();
        if (typeof requestAnimationFrame !== "undefined")
          requestAnimationFrame(restoreFocus);
      });
    }
  }

  function handleRowKeyDown(e: KeyboardEvent, rIdx: number) {
    const direction = rowMoveDirection(e, context.readOnly);
    if (direction === null) return;
    e.preventDefault();
    e.stopPropagation();
    handleMoveRow(rIdx, direction);
  }

  function handleRemoveRow(index: number) {
    const next = [...rows];
    next.splice(index, 1);
    updateRows(next);
  }

  function handleCellChange(rowIndex: number, colId: string, value: any) {
    const next = rows.map((r, i) => {
      if (i !== rowIndex) return r;
      return { ...r, [colId]: value };
    });
    updateRows(next);
  }

  // Only a line with a stable id can hold the single open trade form.
  function tradeFor(row: ItemTableRow) {
    const rowId = typeof row.rowId === "string" ? row.rowId : null;
    if (!tradingEnabled || !rowId) return undefined;
    return {
      open: tradeRowId === rowId,
      onToggle: () => (tradeRowId = tradeRowId === rowId ? null : rowId),
    };
  }

  async function handleDiceRoll(
    rowIndex: number,
    colId: string,
    formula: string,
  ) {
    const key = `${rowIndex}-${colId}`;
    rollStateMap[key] = { rolling: true };
    rollStateMap[key] = await rollItemTableDice(
      field,
      columns,
      rows[rowIndex],
      rowIndex,
      colId,
      formula,
    );
  }
</script>

{#snippet tableHeader()}
  <thead>
    <tr class="border-b border-theme-border/60 bg-theme-surface/20">
      {#each columns as col (col.id)}
        <th
          scope="col"
          class="{getColumnHeaderClass(
            col,
          )} font-bold text-theme-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
        >
          {col.label}
        </th>
      {/each}
      {#if !context.readOnly}
        <th scope="col" class="w-12 px-1 py-1 text-center">
          <span class="sr-only">Actions</span>
        </th>
      {/if}
    </tr>
  </thead>
{/snippet}

{#snippet emptyRow()}
  <tr>
    <td
      colspan={columns.length + (context.readOnly ? 0 : 1)}
      class="px-3 py-3 text-center text-xs italic text-theme-muted"
    >
      {#if catalogue}
        Nothing is for sale right now.
      {:else}
        No rows yet. {#if !context.readOnly}Click "+ Add Row" to add one.{/if}
      {/if}
    </td>
  </tr>
{/snippet}

{#snippet stockRow(row: ItemTableRow, rIdx: number, linked?: Entity)}
  <ItemTableStockRow
    {row}
    {linked}
    {catalogue}
    readOnly={context.readOnly}
    colspan={columns.length + (context.readOnly ? 0 : 1)}
    trade={tradeFor(row)}
    onPatch={(patch) => handleStockPatch(rIdx, patch)}
    onNotice={(notice) => (stockNotice = notice)}
    onOpenLinked={(entityId) => (vault.selectedEntityId = entityId)}
  >
    {#snippet tradePanel(name: string)}
      {#if context.entityId}
        <StockTradePanel
          shopId={context.entityId}
          {field}
          {row}
          {name}
          onClose={() => (tradeRowId = null)}
        />
      {/if}
    {/snippet}
  </ItemTableStockRow>
{/snippet}

{#snippet tableRow(row: ItemTableRow, rIdx: number)}
  {@const linked = linkedEntity(row)}
  {#if !(catalogue && row.stock?.availability === "hidden")}
    <tr
      class="group/row border-b border-theme-border/30 transition-colors hover:bg-theme-surface/30"
      data-row-index={rIdx}
      onkeydown={(e) => handleRowKeyDown(e, rIdx)}
    >
      {#each columns as col (col.id)}
        <ItemTableCell
          {row}
          {col}
          {rIdx}
          {linked}
          {context}
          rollState={rollStateMap[`${rIdx}-${col.id}`]}
          onChange={(value) => handleCellChange(rIdx, col.id, value)}
          onRoll={(formula) => handleDiceRoll(rIdx, col.id, formula)}
        />
      {/each}
      {#if !context.readOnly}
        <ItemTableRowActions
          {row}
          {rIdx}
          linkedTitle={linked?.title}
          rowCount={rows.length}
          onMove={(direction) => handleMoveRow(rIdx, direction)}
          onRemove={() => handleRemoveRow(rIdx)}
        />
      {/if}
    </tr>
    {#if stockEnabled}
      {@render stockRow(row, rIdx, linked)}
    {/if}
  {/if}
{/snippet}

<div
  bind:this={tableContainer}
  data-testid="item-table-node"
  class="my-3 overflow-hidden rounded-lg border border-theme-border/60 bg-theme-bg/40 shadow-xs"
>
  <ItemTableToolbar
    {field}
    {context}
    {tradingEnabled}
    entities={vault.allEntities}
    onAddRow={handleAddRow}
    onLinkItem={handleLinkItem}
  />
  <p class="sr-only" role="status" aria-live="polite">{stockNotice}</p>
  {#if stockNotice}
    <p class="px-3 py-1 text-micro text-amber-400" data-testid="stock-notice">
      {stockNotice}
    </p>
  {/if}
  <div class="overflow-x-auto">
    <table class="w-full min-w-full border-collapse text-xs text-theme-text">
      {@render tableHeader()}
      <tbody>
        {#if !hasVisibleRows}
          {@render emptyRow()}
        {:else}
          {#each rows as row, rIdx (rowKey(row, rIdx))}
            {@render tableRow(row, rIdx)}
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
