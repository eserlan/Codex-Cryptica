<script lang="ts">
  import type { StatSheetField } from "schema";
  import type { PresentationRenderContext } from "../types";
  import { rollStatSheetDiceField } from "$lib/utils/stat-sheet-field-actions";

  let {
    field,
    context,
  }: {
    field: StatSheetField;
    context: PresentationRenderContext;
  } = $props();

  const columns = $derived(
    field.columns ?? [
      { id: "name", label: "Item / Weapon", type: "text" },
      { id: "size", label: "Size/Force", type: "text" },
      { id: "reach", label: "Reach", type: "text" },
      { id: "damage", label: "Damage", type: "dice" },
      { id: "ap", label: "AP", type: "number" },
      { id: "hp", label: "HP", type: "counter" },
    ],
  );

  let rows = $derived<Record<string, any>[]>(field.rows ?? []);

  let rollStateMap = $state<
    Record<
      string,
      { rolling: boolean; text?: string; success?: boolean; isError?: boolean }
    >
  >({});

  function updateRows(nextRows: Record<string, any>[]) {
    if (context.onUpdateFieldValue) {
      context.onUpdateFieldValue(field.id, nextRows as any);
    }
  }

  function handleAddRow() {
    const newRow: Record<string, any> = {};
    for (const col of columns) {
      if (col.type === "counter") {
        newRow[col.id] = { value: 6, max: 6 };
      } else if (col.type === "number") {
        newRow[col.id] = 0;
      } else if (col.type === "dice") {
        newRow[col.id] = "1d6";
      } else {
        newRow[col.id] = "";
      }
    }
    updateRows([...rows, newRow]);
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

  function handleCounterAdjust(rowIndex: number, colId: string, delta: number) {
    const next = rows.map((r, i) => {
      if (i !== rowIndex) return r;
      const current = r[colId];
      const val =
        typeof current === "object" ? current.value : Number(current) || 0;
      const _max = typeof current === "object" ? current.max : undefined;
      const newVal = val + delta;
      return {
        ...r,
        [colId]:
          typeof current === "object" ? { ...current, value: newVal } : newVal,
      };
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

    try {
      const res = await rollStatSheetDiceField({
        id: `${field.id}_${rowIndex}_${colId}`,
        label: `${rows[rowIndex]?.name || field.label} Damage`,
        type: "dice",
        formula,
      });
      rollStateMap[key] = {
        rolling: false,
        text: res.text,
        isError: res.isError,
        success: res.success,
      };
    } catch {
      rollStateMap[key] = {
        rolling: false,
        text: "Error",
        isError: true,
      };
    }
  }
</script>

<div
  class="my-3 overflow-hidden rounded-lg border border-theme-border/60 bg-theme-bg/40 shadow-sm"
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
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded border border-theme-border/60 bg-theme-surface/40 px-2 py-0.5 text-[10px] font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
        onclick={handleAddRow}
        data-testid="item-table-add-row"
      >
        <span class="icon-[lucide--plus] h-3 w-3" aria-hidden="true"></span>
        Add Item
      </button>
    {/if}
  </div>

  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-xs text-theme-text">
      <thead>
        <tr class="border-b border-theme-border/60 bg-theme-surface/20">
          {#each columns as col (col.id)}
            <th
              class="px-2.5 py-1.5 text-center font-bold text-theme-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            >
              {col.label}
            </th>
          {/each}
          {#if !context.readOnly}
            <th class="w-8 px-1 py-1.5 text-center"></th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#if rows.length === 0}
          <tr>
            <td
              colspan={columns.length + (context.readOnly ? 0 : 1)}
              class="px-3 py-3 text-center text-xs italic text-theme-muted"
            >
              No items listed. {#if !context.readOnly}Click "+ Add Item" to add
                one.{/if}
            </td>
          </tr>
        {:else}
          {#each rows as row, rIdx (rIdx)}
            <tr
              class="border-b border-theme-border/40 transition-colors hover:bg-theme-surface/10"
            >
              {#each columns as col (col.id)}
                <td class="px-2.5 py-1.5 text-center align-middle">
                  {#if col.type === "text"}
                    {#if context.readOnly}
                      <span class="font-medium text-theme-text"
                        >{row[col.id] ?? "—"}</span
                      >
                    {:else}
                      <input
                        type="text"
                        class="w-full rounded border border-theme-border/60 bg-theme-bg px-1.5 py-0.5 text-center text-xs text-theme-text focus:border-theme-primary focus:outline-none"
                        value={row[col.id] ?? ""}
                        oninput={(e) =>
                          handleCellChange(
                            rIdx,
                            col.id,
                            (e.target as HTMLInputElement).value,
                          )}
                      />
                    {/if}
                  {:else if col.type === "number"}
                    {#if context.readOnly}
                      <span class="font-mono text-theme-text"
                        >{row[col.id] ?? "—"}</span
                      >
                    {:else}
                      <input
                        type="number"
                        class="w-16 rounded border border-theme-border/60 bg-theme-bg px-1.5 py-0.5 text-center font-mono text-xs text-theme-text focus:border-theme-primary focus:outline-none"
                        value={row[col.id] ?? 0}
                        oninput={(e) =>
                          handleCellChange(
                            rIdx,
                            col.id,
                            Number((e.target as HTMLInputElement).value),
                          )}
                      />
                    {/if}
                  {:else if col.type === "dice"}
                    {@const formula = row[col.id] || "1d6"}
                    {@const key = `${rIdx}-${col.id}`}
                    {@const rollState = rollStateMap[key]}
                    {#if context.mode === "view"}
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 rounded border border-theme-border/80 bg-theme-bg/60 px-2 py-0.5 font-mono text-xs text-theme-primary transition-all hover:border-theme-primary hover:bg-theme-primary/10 disabled:opacity-50"
                        disabled={rollState?.rolling}
                        onclick={() => handleDiceRoll(rIdx, col.id, formula)}
                        title="Click to roll {formula}"
                      >
                        <span
                          class="icon-[lucide--dice-5] h-3 w-3"
                          aria-hidden="true"
                        ></span>
                        <span>{formula}</span>
                        {#if rollState?.text}
                          <span class="ml-1 font-bold text-green-400"
                            >({rollState.text})</span
                          >
                        {/if}
                      </button>
                    {:else if context.readOnly}
                      <span class="font-mono text-xs text-theme-muted"
                        >{formula}</span
                      >
                    {:else}
                      <input
                        type="text"
                        class="w-20 rounded border border-theme-border/60 bg-theme-bg px-1 py-0.5 text-center font-mono text-xs text-theme-text focus:border-theme-primary focus:outline-none"
                        value={formula}
                        oninput={(e) =>
                          handleCellChange(
                            rIdx,
                            col.id,
                            (e.target as HTMLInputElement).value,
                          )}
                      />
                    {/if}
                  {:else if col.type === "counter"}
                    {@const val =
                      typeof row[col.id] === "object"
                        ? row[col.id]?.value
                        : (row[col.id] ?? 0)}
                    {@const max =
                      typeof row[col.id] === "object"
                        ? row[col.id]?.max
                        : undefined}
                    {#if context.readOnly}
                      <span class="font-mono text-xs text-theme-text">
                        {val}{max !== undefined ? ` / ${max}` : ""}
                      </span>
                    {:else}
                      <div class="inline-flex items-center gap-1">
                        <button
                          type="button"
                          class="rounded px-1 text-theme-muted hover:text-theme-primary disabled:opacity-30"
                          onclick={() => handleCounterAdjust(rIdx, col.id, -1)}
                        >
                          —
                        </button>
                        <span class="font-mono text-xs text-theme-text">
                          {val}{max !== undefined ? ` / ${max}` : ""}
                        </span>
                        <button
                          type="button"
                          class="rounded px-1 text-theme-muted hover:text-theme-primary disabled:opacity-30"
                          onclick={() => handleCounterAdjust(rIdx, col.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    {/if}
                  {/if}
                </td>
              {/each}
              {#if !context.readOnly}
                <td class="px-1 py-1.5 text-center align-middle">
                  <button
                    type="button"
                    class="text-theme-muted hover:text-red-400"
                    onclick={() => handleRemoveRow(rIdx)}
                    title="Remove item"
                  >
                    ✕
                  </button>
                </td>
              {/if}
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>
</div>
