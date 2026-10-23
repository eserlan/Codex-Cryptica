<script lang="ts">
  import { tick } from "svelte";
  import ItemTableCell from "./ItemTableCell.svelte";
  import {
    rollItemTableDice,
    type ItemTableRollState,
  } from "./item-table-rolls";
  import {
    defaultCellValue,
    getColumnHeaderClass,
    parseTableMoney,
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
  import {
    adjustQuantity,
    ensureRowIds,
    formatMoney,
    patchStock,
    resolveStockDisplay,
  } from "@codex/stat-sheet-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import StockTradePanel from "./StockTradePanel.svelte";
  import ShopSharingPanel from "./ShopSharingPanel.svelte";
  import StockSuggestionPanel from "./StockSuggestionPanel.svelte";
  import MarketPressurePanel from "./MarketPressurePanel.svelte";

  const linkableItemTypes = ["item", "weapon", "gear", "artifact", "object"];

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

  // Defaults to enabled for back-compat with existing weapon/item tables
  // (which never set this flag); template authors can opt custom tables out.
  const linkEnabled = $derived(field.linkVaultItems ?? true);

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
  let showItemPicker = $state(false);

  const linkableItems = $derived.by(() => {
    // ⚡ Bolt Optimization: Replace Object.values().filter() with an imperative loop
    // over allEntities to avoid unnecessary intermediate array allocations
    const items: Entity[] = [];
    const entities = vault.allEntities;
    const len = entities.length;
    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      if (entity && entity.type) {
        const type = entity.type.toLowerCase();
        for (let j = 0; j < linkableItemTypes.length; j++) {
          if (type.includes(linkableItemTypes[j])) {
            items.push(entity);
            break;
          }
        }
      }
    }
    return items;
  });

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

  function handleStockQuantity(rowIndex: number, next: number | null) {
    const current = rows[rowIndex]?.stock?.quantity;
    const result =
      next === null || !Number.isFinite(next)
        ? { quantity: current ?? 0, clamped: false }
        : adjustQuantity(0, next);
    stockNotice = result.clamped ? "Stock can't go below 0." : "";
    handleStockPatch(rowIndex, { quantity: result.quantity });
  }

  function handleStockStep(rowIndex: number, delta: number) {
    const result = adjustQuantity(rows[rowIndex]?.stock?.quantity, delta);
    stockNotice = result.clamped ? "Stock can't go below 0." : "";
    handleStockPatch(rowIndex, { quantity: result.quantity });
  }

  function handleStockPrice(rowIndex: number, amount: string, unit: string) {
    if (amount.trim() === "") {
      handleStockPatch(rowIndex, { price: undefined });
      stockNotice = "";
      return;
    }
    const price = parseTableMoney(amount, unit);
    if (!price) {
      stockNotice = "Enter a price as digits, with a unit such as gp.";
      return;
    }
    stockNotice = "";
    handleStockPatch(rowIndex, { price });
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
    showItemPicker = false;
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

<div
  bind:this={tableContainer}
  data-testid="item-table-node"
  class="my-3 overflow-hidden rounded-lg border border-theme-border/60 bg-theme-bg/40 shadow-xs"
>
  <div
    class="flex items-center justify-between border-b border-theme-border/60 bg-theme-surface/30 px-3 py-1.5"
  >
    <span
      class="font-header text-xs font-bold uppercase tracking-wider text-theme-primary"
    >
      {field.label}
    </span>
    {#if !context.readOnly}
      <div class="flex items-center gap-1">
        {#if linkEnabled}
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded border border-theme-border/60 bg-theme-surface/40 px-2 py-0.5 text-micro font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
            onclick={() => (showItemPicker = !showItemPicker)}
            data-testid="item-table-link-item"
          >
            <span class="icon-[lucide--link] h-3 w-3" aria-hidden="true"></span>
            Link Vault Item
          </button>
        {/if}
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded border border-theme-border/60 bg-theme-surface/40 px-2 py-0.5 text-micro font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
          onclick={handleAddRow}
          data-testid="item-table-add-row"
        >
          <span class="icon-[lucide--plus] h-3 w-3" aria-hidden="true"></span>
          Add Row
        </button>
      </div>
    {/if}
  </div>

  {#if tradingEnabled}
    <ShopSharingPanel {field} {context} />
    <StockSuggestionPanel {field} {context} />
    <MarketPressurePanel {field} {context} />
  {/if}

  {#if showItemPicker && linkEnabled && !context.readOnly}
    <div
      class="flex items-center gap-2 border-b border-theme-border/60 bg-theme-surface/20 px-3 py-2"
    >
      <label
        class="text-micro font-bold uppercase tracking-wide text-theme-muted"
        for="item-table-link-select"
      >
        Vault item
      </label>
      <select
        id="item-table-link-select"
        class="min-w-0 flex-1 rounded border border-theme-border bg-theme-bg px-2 py-1 text-xs text-theme-text"
        onchange={(event) =>
          handleLinkItem((event.target as HTMLSelectElement).value)}
        data-testid="item-table-link-select"
      >
        <option value="">Choose an item…</option>
        {#each linkableItems as item (item.id)}
          <option value={item.id}>{item.title}</option>
        {/each}
      </select>
    </div>
  {/if}

  <p class="sr-only" role="status" aria-live="polite">{stockNotice}</p>
  {#if stockNotice}
    <p class="px-3 py-1 text-micro text-amber-400" data-testid="stock-notice">
      {stockNotice}
    </p>
  {/if}

  <div class="overflow-x-auto">
    <table class="w-full min-w-full border-collapse text-xs text-theme-text">
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
      <tbody>
        {#if !hasVisibleRows}
          <tr>
            <td
              colspan={columns.length + (context.readOnly ? 0 : 1)}
              class="px-3 py-3 text-center text-xs italic text-theme-muted"
            >
              {#if catalogue}
                Nothing is for sale right now.
              {:else}
                No rows yet. {#if !context.readOnly}Click "+ Add Row" to add
                  one.{/if}
              {/if}
            </td>
          </tr>
        {:else}
          {#each rows as row, rIdx (rowKey(row, rIdx))}
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
                  {@const rowLabel =
                    row.name ||
                    (linked ? linked.title : undefined) ||
                    `item ${rIdx + 1}`}
                  <td
                    class="w-12 px-1 py-0.5 text-center align-middle whitespace-nowrap"
                  >
                    <div
                      class="inline-flex items-center justify-center gap-0.5 opacity-70 group-hover/row:opacity-100 transition-opacity"
                    >
                      <div
                        class="flex flex-col items-center justify-center -space-y-0.5"
                      >
                        <button
                          type="button"
                          data-action="move-up"
                          aria-label={`Move ${rowLabel} up`}
                          class="flex h-3.5 w-4 items-center justify-center rounded-xs text-theme-muted hover:text-theme-primary hover:bg-theme-surface/60 active:scale-95 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-theme-muted disabled:active:scale-100 transition-all"
                          disabled={rIdx === 0}
                          onclick={() => handleMoveRow(rIdx, -1)}
                          title="Move item up (Ctrl+↑)"
                        >
                          <span
                            class="icon-[lucide--chevron-up] h-3 w-3"
                            aria-hidden="true"
                          ></span>
                        </button>
                        <button
                          type="button"
                          data-action="move-down"
                          aria-label={`Move ${rowLabel} down`}
                          class="flex h-3.5 w-4 items-center justify-center rounded-xs text-theme-muted hover:text-theme-primary hover:bg-theme-surface/60 active:scale-95 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-theme-muted disabled:active:scale-100 transition-all"
                          disabled={rIdx === rows.length - 1}
                          onclick={() => handleMoveRow(rIdx, 1)}
                          title="Move item down (Ctrl+↓)"
                        >
                          <span
                            class="icon-[lucide--chevron-down] h-3 w-3"
                            aria-hidden="true"
                          ></span>
                        </button>
                      </div>
                      <button
                        type="button"
                        data-action="remove"
                        aria-label={`Remove ${row.name || `item ${rIdx + 1}`}`}
                        class="flex h-5 w-5 items-center justify-center rounded text-theme-muted hover:bg-red-500/15 hover:text-red-400 active:scale-95 transition-all"
                        onclick={() => handleRemoveRow(rIdx)}
                        title="Remove item"
                      >
                        <span
                          class="icon-[lucide--trash-2] h-3.5 w-3.5"
                          aria-hidden="true"
                        ></span>
                      </button>
                    </div>
                  </td>
                {/if}
              </tr>
              {#if stockEnabled}
                {@const stock = row.stock ?? {}}
                {@const display = resolveStockDisplay(row, linked)}
                <tr
                  class="border-b border-theme-border/30 bg-theme-surface/10"
                  data-testid="stock-row"
                  data-row-id={row.rowId}
                >
                  <td
                    colspan={columns.length + (context.readOnly ? 0 : 1)}
                    class="px-2 py-1.5"
                  >
                    {#if context.readOnly}
                      {#if stock.availability !== "hidden"}
                        <div
                          class="flex flex-wrap items-center gap-x-3 gap-y-1"
                        >
                          {#if !catalogue}
                            <span class="font-bold text-theme-text"
                              >{display.name}</span
                            >
                          {/if}
                          {#if stock.kind !== "service" && stock.kind !== "commission" && stock.quantity !== undefined}
                            <span class="font-mono">×{stock.quantity}</span>
                          {/if}
                          {#if display.shopPrice}
                            <span class="font-mono"
                              >{formatMoney(display.shopPrice)}</span
                            >
                          {:else if display.sourcePrice}
                            <span class="font-mono">{display.sourcePrice}</span>
                          {/if}
                          {#if stock.condition}<span>{stock.condition}</span
                            >{/if}
                          {#if stock.availability && stock.availability !== "available"}
                            <span class="italic text-theme-muted"
                              >{stock.availability}</span
                            >
                          {/if}
                          {#if stock.note && !catalogue}<span
                              class="text-theme-muted">{stock.note}</span
                            >{/if}
                        </div>
                      {/if}
                    {:else}
                      <div class="flex flex-wrap items-end gap-2">
                        <label
                          class="flex flex-col text-micro text-theme-muted"
                        >
                          Kind
                          <select
                            class="rounded border border-theme-border/60 bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
                            value={stock.kind ?? "item"}
                            onchange={(e) =>
                              handleStockPatch(rIdx, {
                                kind: (e.target as HTMLSelectElement).value,
                              })}
                          >
                            <option value="item">Item</option>
                            <option value="service">Service</option>
                            <option value="commission">Commission</option>
                          </select>
                        </label>
                        {#if (stock.kind ?? "item") === "item"}
                          <div
                            class="flex flex-col text-micro text-theme-muted"
                          >
                            <span>Quantity</span>
                            <div class="inline-flex items-center gap-0.5">
                              <button
                                type="button"
                                data-action="stock-dec"
                                aria-label={`Decrease quantity of ${display.name}`}
                                class="flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-theme-muted hover:text-theme-primary"
                                onclick={() => handleStockStep(rIdx, -1)}
                                >—</button
                              >
                              <input
                                type="number"
                                min="0"
                                step="1"
                                data-action="stock-qty"
                                aria-label={`Quantity of ${display.name}`}
                                class="w-14 rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-center font-mono text-xs text-theme-text"
                                value={stock.quantity ?? 0}
                                onchange={(e) => {
                                  const raw = (e.target as HTMLInputElement)
                                    .value;
                                  handleStockQuantity(
                                    rIdx,
                                    raw === "" ? null : Math.trunc(Number(raw)),
                                  );
                                }}
                              />
                              <button
                                type="button"
                                data-action="stock-inc"
                                aria-label={`Increase quantity of ${display.name}`}
                                class="flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-theme-muted hover:text-theme-primary"
                                onclick={() => handleStockStep(rIdx, 1)}
                                >+</button
                              >
                            </div>
                          </div>
                        {/if}
                        <div class="flex flex-col text-micro text-theme-muted">
                          <span>Shop price</span>
                          <div class="inline-flex items-center gap-0.5">
                            <input
                              type="text"
                              inputmode="decimal"
                              data-action="stock-price"
                              aria-label={`Shop price of ${display.name}`}
                              class="w-16 rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-center font-mono text-xs text-theme-text"
                              value={stock.price
                                ? formatMoney(stock.price, false)
                                : ""}
                              onchange={(e) => {
                                const unitEl = (
                                  e.target as HTMLInputElement
                                ).parentElement?.querySelector<HTMLInputElement>(
                                  "[data-action='stock-unit']",
                                );
                                handleStockPrice(
                                  rIdx,
                                  (e.target as HTMLInputElement).value,
                                  unitEl?.value ||
                                    stock.price?.currency ||
                                    "gp",
                                );
                              }}
                            />
                            <input
                              type="text"
                              data-action="stock-unit"
                              aria-label={`Price unit of ${display.name}`}
                              class="w-12 rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-center text-xs text-theme-text"
                              value={stock.price?.currency ?? "gp"}
                              onchange={(e) => {
                                if (!stock.price) return;
                                handleStockPrice(
                                  rIdx,
                                  formatMoney(stock.price, false),
                                  (e.target as HTMLInputElement).value,
                                );
                              }}
                            />
                          </div>
                          <span data-testid="price-source" class="italic">
                            {#if display.priceIsOverride}
                              Shop override{display.sourcePrice
                                ? ` (item: ${display.sourcePrice})`
                                : ""}
                            {:else if display.sourcePrice}
                              Using item price: {display.sourcePrice}
                            {:else}
                              No price set
                            {/if}
                          </span>
                        </div>
                        <label
                          class="flex flex-col text-micro text-theme-muted"
                        >
                          Availability
                          <select
                            class="rounded border border-theme-border/60 bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
                            value={stock.availability ?? "available"}
                            onchange={(e) =>
                              handleStockPatch(rIdx, {
                                availability: (e.target as HTMLSelectElement)
                                  .value,
                              })}
                          >
                            <option value="available">Available</option>
                            <option value="reserved">Reserved</option>
                            <option value="sold-out">Sold out</option>
                            <option value="hidden">Hidden</option>
                          </select>
                        </label>
                        <label
                          class="flex flex-col text-micro text-theme-muted"
                        >
                          Condition
                          <input
                            type="text"
                            class="w-24 rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-xs text-theme-text"
                            value={stock.condition ?? ""}
                            oninput={(e) =>
                              handleStockPatch(rIdx, {
                                condition: (e.target as HTMLInputElement).value,
                              })}
                          />
                        </label>
                        <label
                          class="flex min-w-[8rem] flex-1 flex-col text-micro text-theme-muted"
                        >
                          Note
                          <input
                            type="text"
                            class="rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-xs text-theme-text"
                            value={stock.note ?? ""}
                            oninput={(e) =>
                              handleStockPatch(rIdx, {
                                note: (e.target as HTMLInputElement).value,
                              })}
                          />
                        </label>
                        {#if tradingEnabled && typeof row.rowId === "string"}
                          <button
                            type="button"
                            data-action="open-trade"
                            aria-expanded={tradeRowId === row.rowId}
                            aria-label={`Trade ${display.name}`}
                            class="inline-flex items-center gap-1 rounded border border-theme-border/60 bg-theme-surface/40 px-2 py-0.5 text-micro font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
                            onclick={() =>
                              (tradeRowId =
                                tradeRowId === row.rowId ? null : row.rowId)}
                          >
                            <span
                              class="icon-[lucide--hand-coins] h-3 w-3"
                              aria-hidden="true"
                            ></span>
                            Trade
                          </button>
                        {/if}
                        {#if display.linked && typeof row.entityId === "string"}
                          <button
                            type="button"
                            data-action="open-linked-item"
                            aria-label={`Open ${display.name}`}
                            class="inline-flex items-center gap-1 rounded border border-theme-border/60 bg-theme-surface/40 px-2 py-0.5 text-micro font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
                            onclick={() =>
                              (vault.selectedEntityId = row.entityId)}
                          >
                            <span
                              class="icon-[lucide--external-link] h-3 w-3"
                              aria-hidden="true"
                            ></span>
                            Open item
                          </button>
                        {/if}
                        {#if display.missing}
                          <span class="text-micro italic text-theme-muted"
                            >Linked item no longer exists; showing the saved
                            name.</span
                          >
                        {/if}
                      </div>
                      {#if tradingEnabled && tradeRowId !== null && tradeRowId === row.rowId && context.entityId}
                        <StockTradePanel
                          shopId={context.entityId}
                          {field}
                          {row}
                          name={display.name}
                          onClose={() => (tradeRowId = null)}
                        />
                      {/if}
                    {/if}
                  </td>
                </tr>
              {/if}
            {/if}
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
