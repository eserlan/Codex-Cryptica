<script lang="ts">
  import type { Entity, StatSheetField } from "schema";
  import type { PresentationRenderContext } from "../types";
  import ShopSharingPanel from "./ShopSharingPanel.svelte";
  import StockSuggestionPanel from "./StockSuggestionPanel.svelte";
  import MarketPressurePanel from "./MarketPressurePanel.svelte";
  let {
    field,
    context,
    entities,
    tradingEnabled,
    onAddRow,
    onLinkItem,
  }: {
    field: StatSheetField;
    context: PresentationRenderContext;
    entities: Entity[];
    tradingEnabled: boolean;
    onAddRow: () => void;
    onLinkItem: (entityId: string) => void;
  } = $props();
  const linkableItemTypes = ["item", "weapon", "gear", "artifact", "object"];
  // Defaults to enabled for existing item tables.
  const linkEnabled = $derived(field.linkVaultItems ?? true);
  let showItemPicker = $state(false);
  const linkableItems = $derived.by(() => {
    // ⚡ Bolt Optimization: Replace Object.values().filter() with an imperative loop
    // over allEntities to avoid unnecessary intermediate array allocations
    const items: Entity[] = [];
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

  function handleLinkItem(entityId: string) {
    if (!entityId) return;
    onLinkItem(entityId);
    showItemPicker = false;
  }
</script>

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
        onclick={onAddRow}
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
