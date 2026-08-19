<script lang="ts">
  import {
    DEFAULT_ITEM_TABLE_COLUMNS,
    type Entity,
    type StatSheetField,
  } from "schema";
  import type { PresentationRenderContext } from "../types";
  import { rollStatSheetDiceField } from "$lib/utils/stat-sheet-field-actions";
  import { vault } from "$lib/stores/vault.svelte";

  const linkableItemTypes = ["item", "weapon", "gear", "artifact", "object"];

  let {
    field,
    context,
  }: {
    field: StatSheetField;
    context: PresentationRenderContext;
  } = $props();

  const columns = $derived(field.columns ?? DEFAULT_ITEM_TABLE_COLUMNS);

  let rows = $derived<Record<string, any>[]>(field.rows ?? []);

  // Defaults to enabled for back-compat with existing weapon/item tables
  // (which never set this flag); template authors can opt custom tables out.
  const linkEnabled = $derived(field.linkVaultItems ?? true);

  let rollStateMap = $state<
    Record<
      string,
      { rolling: boolean; text?: string; success?: boolean; isError?: boolean }
    >
  >({});
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

  function linkedValue(row: Record<string, any>, columnId: string) {
    const entity = linkedEntity(row);
    if (!entity) return undefined;
    if (columnId === "name") return entity.title;
    const sourceField = entity.statSheet?.fields?.find(
      (candidate) => candidate.id === columnId,
    );
    return sourceField?.value ?? sourceField?.formula;
  }

  function updateRows(nextRows: Record<string, any>[]) {
    context.onUpdateField(field.id, { rows: nextRows });
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
      } else if (col.type === "checkbox") {
        newRow[col.id] = false;
      } else {
        newRow[col.id] = "";
      }
    }
    updateRows([...rows, newRow]);
  }

  function handleLinkItem(entityId: string) {
    if (!entityId) return;
    updateRows([...rows, { entityId }]);
    showItemPicker = false;
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
      const value =
        current && typeof current === "object"
          ? Number(current.value)
          : Number(current);
      const max =
        current && typeof current === "object" ? Number(current.max) : NaN;
      const currentValue = Number.isFinite(value) ? value : 0;
      const adjustedValue = currentValue + delta;
      const nextValue = Math.max(
        0,
        Number.isFinite(max) ? Math.min(max, adjustedValue) : adjustedValue,
      );
      return {
        ...r,
        [colId]:
          current && typeof current === "object"
            ? { ...current, value: nextValue }
            : nextValue,
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
      <div class="flex items-center gap-1">
        {#if linkEnabled}
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded border border-theme-border/60 bg-theme-surface/40 px-2 py-0.5 text-[10px] font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
            onclick={() => (showItemPicker = !showItemPicker)}
            data-testid="item-table-link-item"
          >
            <span class="icon-[lucide--link] h-3 w-3" aria-hidden="true"></span>
            Link Vault Item
          </button>
        {/if}
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded border border-theme-border/60 bg-theme-surface/40 px-2 py-0.5 text-[10px] font-bold text-theme-muted transition-colors hover:border-theme-primary hover:text-theme-primary"
          onclick={handleAddRow}
          data-testid="item-table-add-row"
        >
          <span class="icon-[lucide--plus] h-3 w-3" aria-hidden="true"></span>
          Add Row
        </button>
      </div>
    {/if}
  </div>

  {#if showItemPicker && linkEnabled && !context.readOnly}
    <div
      class="flex items-center gap-2 border-b border-theme-border/60 bg-theme-surface/20 px-3 py-2"
    >
      <label
        class="text-[10px] font-bold uppercase tracking-wide text-theme-muted"
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

  <div class="overflow-x-auto">
    <table class="w-full border-collapse text-xs text-theme-text">
      <thead>
        <tr class="border-b border-theme-border/60 bg-theme-surface/20">
          {#each columns as col (col.id)}
            <th
              scope="col"
              class="px-2.5 py-1.5 text-center font-bold text-theme-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            >
              {col.label}
            </th>
          {/each}
          {#if !context.readOnly}
            <th scope="col" class="w-8 px-1 py-1.5 text-center">
              <span class="sr-only">Actions</span>
            </th>
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
              No rows yet. {#if !context.readOnly}Click "+ Add Row" to add one.{/if}
            </td>
          </tr>
        {:else}
          {#each rows as row, rIdx (rIdx)}
            {@const linked = linkedEntity(row)}
            <tr
              class="border-b border-theme-border/40 transition-colors hover:bg-theme-surface/10"
            >
              {#each columns as col (col.id)}
                <td class="px-2.5 py-1.5 text-center align-middle">
                  {#if col.type === "text"}
                    {#if context.readOnly}
                      <span class="font-medium text-theme-text"
                        >{linkedValue(row, col.id) ?? row[col.id] ?? "—"}</span
                      >
                    {:else if linked && linkedValue(row, col.id) !== undefined}
                      <span class="font-medium text-theme-text"
                        >{linkedValue(row, col.id)}</span
                      >
                    {:else}
                      <input
                        type="text"
                        aria-label={`${col.label} for item ${rIdx + 1}`}
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
                        >{linkedValue(row, col.id) ?? row[col.id] ?? "—"}</span
                      >
                    {:else if linked && linkedValue(row, col.id) !== undefined}
                      <span class="font-mono text-theme-text"
                        >{linkedValue(row, col.id)}</span
                      >
                    {:else}
                      <input
                        type="number"
                        aria-label={`${col.label} for item ${rIdx + 1}`}
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
                        aria-label={`Roll ${formula} for ${row.name || `item ${rIdx + 1}`}`}
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
                          <span
                            class={rollState.isError
                              ? "ml-1 font-bold text-red-400"
                              : rollState.success === false
                                ? "ml-1 font-bold text-red-400"
                                : "ml-1 font-bold text-green-400"}
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
                        aria-label={`${col.label} formula for item ${rIdx + 1}`}
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
                          aria-label={`Decrease ${col.label} for ${row.name || `item ${rIdx + 1}`}`}
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
                          aria-label={`Increase ${col.label} for ${row.name || `item ${rIdx + 1}`}`}
                          class="rounded px-1 text-theme-muted hover:text-theme-primary disabled:opacity-30"
                          onclick={() => handleCounterAdjust(rIdx, col.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    {/if}
                  {:else if col.type === "checkbox"}
                    <input
                      type="checkbox"
                      aria-label={`${col.label} for item ${rIdx + 1}`}
                      checked={row[col.id] === true}
                      disabled={context.readOnly}
                      onchange={(e) =>
                        handleCellChange(
                          rIdx,
                          col.id,
                          (e.target as HTMLInputElement).checked,
                        )}
                    />
                  {/if}
                </td>
              {/each}
              {#if !context.readOnly}
                <td class="px-1 py-1.5 text-center align-middle">
                  <button
                    type="button"
                    aria-label={`Remove ${row.name || `item ${rIdx + 1}`}`}
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
