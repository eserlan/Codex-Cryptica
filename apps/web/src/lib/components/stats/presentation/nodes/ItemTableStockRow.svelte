<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Entity } from "schema";
  import {
    adjustQuantity,
    formatMoney,
    resolveStockDisplay,
  } from "@codex/stat-sheet-engine";
  import { parseTableMoney, type ItemTableRow } from "./item-table-values";

  let {
    row,
    linked,
    colspan,
    readOnly,
    catalogue,
    trade,
    tradePanel,
    onPatch,
    onNotice,
    onOpenLinked,
  }: {
    row: ItemTableRow;
    linked?: Entity;
    colspan: number;
    readOnly: boolean;
    catalogue: boolean;
    /** Present only when this line can be traded (#3963). */
    trade?: { open: boolean; onToggle: () => void };
    /** Rendered under the editor while the trade form is open; gets the display name. */
    tradePanel?: Snippet<[string]>;
    onPatch: (patch: Record<string, any>) => void;
    onNotice: (notice: string) => void;
    onOpenLinked: (entityId: string) => void;
  } = $props();

  const stock = $derived(row.stock ?? {});
  const display = $derived(resolveStockDisplay(row, linked));

  function applyQuantity(result: { quantity: number; clamped: boolean }) {
    onNotice(result.clamped ? "Stock can't go below 0." : "");
    onPatch({ quantity: result.quantity });
  }

  function handleStockQuantity(next: number | null) {
    applyQuantity(
      next === null || !Number.isFinite(next)
        ? { quantity: stock.quantity ?? 0, clamped: false }
        : adjustQuantity(0, next),
    );
  }

  function handleStockStep(delta: number) {
    applyQuantity(adjustQuantity(stock.quantity, delta));
  }

  function handleStockPrice(amount: string, unit: string) {
    if (amount.trim() === "") {
      onPatch({ price: undefined });
      onNotice("");
      return;
    }
    const price = parseTableMoney(amount, unit);
    if (!price) {
      onNotice("Enter a price as digits, with a unit such as gp.");
      return;
    }
    onNotice("");
    onPatch({ price });
  }
</script>

{#snippet stockFacts()}
  {#if display.shopPrice}
    <span class="font-mono">{formatMoney(display.shopPrice)}</span>
  {:else if display.sourcePrice}
    <span class="font-mono">{display.sourcePrice}</span>
  {/if}
  {#if stock.condition}<span>{stock.condition}</span>{/if}
  {#if stock.availability && stock.availability !== "available"}
    <span class="italic text-theme-muted">{stock.availability}</span>
  {/if}
  {#if stock.note && !catalogue}<span class="text-theme-muted"
      >{stock.note}</span
    >{/if}
{/snippet}

{#snippet stockSummary()}
  {#if stock.availability !== "hidden"}
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      {#if !catalogue}
        <span class="font-bold text-theme-text">{display.name}</span>
      {/if}
      {#if stock.kind !== "service" && stock.kind !== "commission" && stock.quantity !== undefined}
        <span class="font-mono">×{stock.quantity}</span>
      {/if}
      {@render stockFacts()}
    </div>
  {/if}
{/snippet}

{#snippet quantityEditor()}
  {#if (stock.kind ?? "item") === "item"}
    <div class="flex flex-col text-micro text-theme-muted">
      <span>Quantity</span>
      <div class="inline-flex items-center gap-0.5">
        <button
          type="button"
          data-action="stock-dec"
          aria-label={`Decrease quantity of ${display.name}`}
          class="flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-theme-muted hover:text-theme-primary"
          onclick={() => handleStockStep(-1)}>—</button
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
            const raw = (e.target as HTMLInputElement).value;
            handleStockQuantity(raw === "" ? null : Math.trunc(Number(raw)));
          }}
        />
        <button
          type="button"
          data-action="stock-inc"
          aria-label={`Increase quantity of ${display.name}`}
          class="flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-theme-muted hover:text-theme-primary"
          onclick={() => handleStockStep(1)}>+</button
        >
      </div>
    </div>
  {/if}
{/snippet}

{#snippet priceEditor()}
  <div class="flex flex-col text-micro text-theme-muted">
    <span>Shop price</span>
    <div class="inline-flex items-center gap-0.5">
      <input
        type="text"
        inputmode="decimal"
        data-action="stock-price"
        aria-label={`Shop price of ${display.name}`}
        class="w-16 rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-center font-mono text-xs text-theme-text"
        value={stock.price ? formatMoney(stock.price, false) : ""}
        onchange={(e) => {
          const unitEl = (
            e.target as HTMLInputElement
          ).parentElement?.querySelector<HTMLInputElement>(
            "[data-action='stock-unit']",
          );
          handleStockPrice(
            (e.target as HTMLInputElement).value,
            unitEl?.value || stock.price?.currency || "gp",
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
{/snippet}

{#snippet stockActions()}
  {#if trade}
    <button
      type="button"
      data-action="open-trade"
      aria-expanded={trade.open}
      aria-label={`Trade ${display.name}`}
      class="inline-flex items-center gap-1 rounded border border-theme-border/60 bg-theme-surface/40 px-2 py-0.5 text-micro font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
      onclick={trade.onToggle}
    >
      <span class="icon-[lucide--hand-coins] h-3 w-3" aria-hidden="true"></span>
      Trade
    </button>
  {/if}
  {#if display.linked && typeof row.entityId === "string"}
    <button
      type="button"
      data-action="open-linked-item"
      aria-label={`Open ${display.name}`}
      class="inline-flex items-center gap-1 rounded border border-theme-border/60 bg-theme-surface/40 px-2 py-0.5 text-micro font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
      onclick={() => onOpenLinked(row.entityId)}
    >
      <span class="icon-[lucide--external-link] h-3 w-3" aria-hidden="true"
      ></span>
      Open item
    </button>
  {/if}
  {#if display.missing}
    <span class="text-micro italic text-theme-muted"
      >Linked item no longer exists; showing the saved name.</span
    >
  {/if}
{/snippet}

{#snippet stockEditor()}
  <div class="flex flex-wrap items-end gap-2">
    <label class="flex flex-col text-micro text-theme-muted">
      Kind
      <select
        class="rounded border border-theme-border/60 bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
        value={stock.kind ?? "item"}
        onchange={(e) =>
          onPatch({
            kind: (e.target as HTMLSelectElement).value,
          })}
      >
        <option value="item">Item</option>
        <option value="service">Service</option>
        <option value="commission">Commission</option>
      </select>
    </label>
    {@render quantityEditor()}
    {@render priceEditor()}
    <label class="flex flex-col text-micro text-theme-muted">
      Availability
      <select
        class="rounded border border-theme-border/60 bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
        value={stock.availability ?? "available"}
        onchange={(e) =>
          onPatch({
            availability: (e.target as HTMLSelectElement).value,
          })}
      >
        <option value="available">Available</option>
        <option value="reserved">Reserved</option>
        <option value="sold-out">Sold out</option>
        <option value="hidden">Hidden</option>
      </select>
    </label>
    <label class="flex flex-col text-micro text-theme-muted">
      Condition
      <input
        type="text"
        class="w-24 rounded border border-theme-border/60 bg-theme-bg/80 px-1 py-0.5 text-xs text-theme-text"
        value={stock.condition ?? ""}
        oninput={(e) =>
          onPatch({
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
          onPatch({
            note: (e.target as HTMLInputElement).value,
          })}
      />
    </label>
    {@render stockActions()}
  </div>
{/snippet}

<tr
  class="border-b border-theme-border/30 bg-theme-surface/10"
  data-testid="stock-row"
  data-row-id={row.rowId}
>
  <td {colspan} class="px-2 py-1.5">
    {#if readOnly}
      {@render stockSummary()}
    {:else}
      {@render stockEditor()}
      {#if trade?.open && tradePanel}
        {@render tradePanel(display.name)}
      {/if}
    {/if}
  </td>
</tr>
