<script lang="ts">
  /* eslint-disable svelte/no-useless-mustaches -- Class expressions keep review notes on inherited colours. */
  import { DEFAULT_ITEM_TABLE_COLUMNS, type StatSheetField } from "schema";
  import type { IdGenerator } from "#lib/utils/runtime-deps.js";
  import StatSheetColumnEditor from "./StatSheetColumnEditor.svelte";
  type Column = NonNullable<StatSheetField["columns"]>[number];
  let {
    field,
    onUpdate,
    idGenerator,
  }: {
    field: StatSheetField;
    onUpdate: (updates: Partial<StatSheetField>) => void;
    idGenerator: IdGenerator;
  } = $props();
  const columns = $derived(field.columns ?? DEFAULT_ITEM_TABLE_COLUMNS);
  function addColumn() {
    onUpdate({
      columns: [
        ...columns,
        { id: `col-${idGenerator.uuid()}`, label: "New Column", type: "text" },
      ],
    });
  }
  function updateColumn(id: string, updates: Partial<Column>) {
    onUpdate({
      columns: columns.map((col) =>
        col.id === id ? { ...col, ...updates } : col,
      ),
    });
  }
  function removeColumn(id: string) {
    onUpdate({ columns: columns.filter((col) => col.id !== id) });
  }
  function moveColumn(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= columns.length) return;
    const next = [...columns];
    [next[index], next[target]] = [next[target], next[index]];
    onUpdate({ columns: next });
  }
</script>

<div
  class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
  "flex flex-col gap-1.5 text-micro text-theme-muted"}
>
  <label class="flex items-center gap-1.5">
    <input
      type="checkbox"
      checked={field.linkVaultItems ?? true}
      onchange={(e) =>
        onUpdate({
          linkVaultItems: (e.target as HTMLInputElement).checked,
        })}
    />
    Allow linking rows to vault items
  </label>
  <label class="flex items-center gap-1.5">
    <input
      type="checkbox"
      data-testid="stock-ledger-toggle"
      checked={field.stockLedger ?? false}
      onchange={(e) =>
        onUpdate({
          stockLedger: (e.target as HTMLInputElement).checked,
        })}
    />
    Merchant stock ledger (quantity, shop price, availability)
  </label>
  {#each columns as col, colIndex (col.id)}
    <StatSheetColumnEditor
      {col}
      {colIndex}
      columnCount={columns.length}
      onUpdate={(updates) => updateColumn(col.id, updates)}
      onMove={(direction) => moveColumn(colIndex, direction)}
      onRemove={() => removeColumn(col.id)}
    />
  {/each}
  <button
    type="button"
    class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
    "self-start rounded border border-theme-border px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"}
    onclick={() => addColumn()}
  >
    + Add Column
  </button>
</div>
