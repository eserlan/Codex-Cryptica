<script lang="ts">
  import type { StatSheetField, StockMeta } from "schema";
  import {
    formatMoney,
    projectCatalogueFields,
  } from "@codex/stat-sheet-engine";
  import { vault } from "$lib/stores/vault.svelte";
  import type { PresentationRenderContext } from "../types";

  /**
   * What players receive for this shop (#3964), built by the same function
   * the guest transport uses, so the preview cannot drift from what is sent.
   * It draws its own plain list rather than the editable ledger, so nothing
   * here can offer a control to change the shop.
   */
  let {
    context,
  }: {
    context: PresentationRenderContext;
  } = $props();

  const shown = $derived(
    projectCatalogueFields(context.fields, {
      resolveName: (entityId) => vault.entities[entityId]?.title,
    }),
  );

  const ledgers = $derived(
    shown.filter((field: StatSheetField) => field.type === "item-table"),
  );
  const notes = $derived(
    shown.filter((field: StatSheetField) => field.type !== "item-table"),
  );
  /** The one-line summary of a stock line: amount, price, condition, status. */
  function details(row: Record<string, unknown>): string[] {
    const stock = (row.stock ?? {}) as StockMeta;
    const unitless = stock.kind === "service" || stock.kind === "commission";
    return [
      stock.quantity !== undefined && !unitless ? `×${stock.quantity}` : "",
      stock.price ? formatMoney(stock.price) : "",
      stock.condition ?? "",
      stock.availability && stock.availability !== "available"
        ? stock.availability
        : "",
    ].filter(Boolean);
  }
</script>

<section
  class="border-b border-theme-border/60 bg-theme-bg/60 px-3 py-2"
  aria-label="Preview as player"
  data-testid="player-preview"
>
  <p class="text-micro font-bold uppercase tracking-wide text-theme-primary">
    Preview as player
  </p>
  <p class="mb-2 text-micro text-theme-muted">
    This is exactly what players receive. Nothing else about this shop is sent.
  </p>

  {#if shown.length === 0}
    <p
      class="text-xs italic text-theme-muted"
      data-testid="player-preview-empty"
    >
      Players see nothing for this shop. It is not shared.
    </p>
  {:else}
    {#each ledgers as field (field.id)}
      <ul class="mb-2 space-y-1" aria-label={field.label}>
        {#each field.rows ?? [] as row, index (index)}
          <li
            class="flex flex-wrap items-baseline gap-x-3 text-xs text-theme-text"
            data-testid="player-preview-row"
          >
            <span class="font-bold">{row.name}</span>
            {#each details(row) as detail (detail)}
              <span class="font-mono text-theme-muted">{detail}</span>
            {/each}
          </li>
        {/each}
      </ul>
    {/each}
    {#each notes as field (field.id)}
      <p class="text-xs text-theme-text" data-testid="player-preview-field">
        <span class="font-bold">{field.label}:</span>
        {field.value}
      </p>
    {/each}
  {/if}
</section>
