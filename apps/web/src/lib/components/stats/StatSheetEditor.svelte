<script lang="ts">
  import {
    DEFAULT_ITEM_TABLE_COLUMNS,
    type Entity,
    type StatSheetField,
    type StatSheetFieldType,
  } from "schema";
  import { untrack } from "svelte";
  import { StatSheetEditorState } from "./StatSheetEditorState.svelte.js";
  import { StatSheetFieldOrder } from "./StatSheetFieldOrder.svelte.js";
  import { slugifyFieldKey } from "@codex/stat-sheet-engine";
  import { vault } from "#lib/stores/vault.svelte.js";
  import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
  import {
    type IdGenerator,
    systemIdGenerator,
  } from "#lib/utils/runtime-deps.js";
  import { applyTypedFormula } from "#lib/utils/stat-sheet-field-actions.js";

  let {
    entity,
    onClose = () => {},
    idGenerator = systemIdGenerator,
  }: {
    entity: Entity;
    onClose?: () => void;
    idGenerator?: IdGenerator;
  } = $props();

  const FIELD_TYPES: { value: StatSheetFieldType; label: string }[] = [
    { value: "counter", label: "Counter" },
    { value: "number", label: "Number" },
    { value: "text", label: "Text" },
    { value: "longtext", label: "Long Text" },
    { value: "heading", label: "Section Heading" },
    { value: "dice", label: "Dice Roll" },
    { value: "dice-pool", label: "Dice Pool" },
    { value: "item-table", label: "Repeatable Table" },
  ];

  const COLUMN_TYPES: {
    value: NonNullable<StatSheetField["columns"]>[number]["type"];
    label: string;
  }[] = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "dice", label: "Dice Formula" },
    { value: "counter", label: "Counter" },
    { value: "checkbox", label: "Checkbox" },
    { value: "money", label: "Price (amount + unit)" },
  ];

  const editor = untrack(
    () =>
      new StatSheetEditorState(
        () => entity,
        { uuid: () => idGenerator.uuid() },
        vault,
        notificationStore,
      ),
  );
  const order = new StatSheetFieldOrder(() => editor.fields, editor.persist);
  $effect(() => {
    editor.fields = $state.snapshot(entity.statSheet?.fields ?? []);
  });
  function tableColumns(field: StatSheetField) {
    return field.columns ?? DEFAULT_ITEM_TABLE_COLUMNS;
  }

  function addColumn(field: StatSheetField) {
    const id = `col-${idGenerator.uuid()}`;
    editor.updateField(field.id, {
      columns: [
        ...tableColumns(field),
        { id, label: "New Column", type: "text" },
      ],
    });
  }

  function updateColumn(
    field: StatSheetField,
    columnId: string,
    updates: Partial<NonNullable<StatSheetField["columns"]>[number]>,
  ) {
    editor.updateField(field.id, {
      columns: tableColumns(field).map((c) =>
        c.id === columnId ? { ...c, ...updates } : c,
      ),
    });
  }

  function removeColumn(field: StatSheetField, columnId: string) {
    editor.updateField(field.id, {
      columns: tableColumns(field).filter((c) => c.id !== columnId),
    });
  }

  function moveColumn(field: StatSheetField, index: number, direction: -1 | 1) {
    const cols = tableColumns(field);
    const target = index + direction;
    if (target < 0 || target >= cols.length) return;
    const next = [...cols];
    [next[index], next[target]] = [next[target], next[index]];
    editor.updateField(field.id, { columns: next });
  }
</script>

<!-- fallow-ignore-next-line complexity -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flex flex-col gap-3 outline-none"
  tabindex="0"
  onkeydown={order.handleContainerKeyDown}
  data-testid="stat-sheet-editor"
>
  {#each editor.fields as field, index (field.id)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex flex-col gap-2 rounded border p-2 transition-colors {order.draggedIndex ===
      index
        ? 'opacity-40 border-dashed border-theme-primary'
        : order.dragOverIndex === index
          ? 'border-theme-primary bg-theme-primary/10 ring-1 ring-theme-primary'
          : order.selectedFieldId === field.id
            ? 'border-theme-primary bg-theme-primary/10 ring-2 ring-theme-primary/40'
            : 'border-theme-border'}"
      draggable="true"
      ondragstart={(e) => order.handleDragStart(e, index)}
      ondragover={(e) => order.handleDragOver(e, index)}
      ondragleave={() => (order.dragOverIndex = null)}
      ondrop={(e) => order.handleDrop(e, index)}
      ondragend={order.handleDragEnd}
      onkeydown={(e) => order.handleFieldKeyDown(e, index)}
      onfocusin={() => (order.selectedFieldId = field.id)}
      onclick={() => (order.selectedFieldId = field.id)}
      data-field-id={field.id}
      data-selected={order.selectedFieldId === field.id ? "true" : "false"}
      aria-selected={order.selectedFieldId === field.id}
      data-testid="stat-sheet-editor-field"
    >
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex items-center cursor-grab active:cursor-grabbing text-theme-muted hover:text-theme-primary p-0.5 shrink-0 rounded focus:outline-none focus:ring-1 focus:ring-theme-primary"
          title="Drag or use Alt/Ctrl+Up/Down to reorder"
          aria-label={`Drag or press Alt/Ctrl Up or Alt/Ctrl Down to reorder ${field.label}`}
          data-testid="stat-sheet-drag-handle"
        >
          <span class="icon-[lucide--grip-vertical] h-4 w-4" aria-hidden="true"
          ></span>
        </button>
        <input
          type="text"
          class="flex-1 rounded border border-theme-border bg-theme-bg px-1.5 py-1 text-xs text-theme-text"
          value={field.label}
          aria-label="Field label"
          oninput={(e) =>
            editor.updateField(field.id, {
              label: (e.target as HTMLInputElement).value,
            })}
        />
        <select
          class="rounded border border-theme-border bg-theme-bg px-1.5 py-1 text-xs text-theme-text"
          value={field.type}
          aria-label="Field type"
          onchange={(e) =>
            editor.changeFieldType(
              field,
              (e.target as HTMLSelectElement).value as StatSheetFieldType,
            )}
        >
          {#each FIELD_TYPES as t (t.value)}
            <option value={t.value}>{t.label}</option>
          {/each}
        </select>
        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
          onclick={() => order.moveField(index, -1)}
          disabled={index === 0}
          aria-label={`Move ${field.label} up`}
        >
          <span class="icon-[lucide--chevron-up] h-3.5 w-3.5" aria-hidden="true"
          ></span>
        </button>
        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
          onclick={() => order.moveField(index, 1)}
          disabled={index === editor.fields.length - 1}
          aria-label={`Move ${field.label} down`}
        >
          <span
            class="icon-[lucide--chevron-down] h-3.5 w-3.5"
            aria-hidden="true"
          ></span>
        </button>
        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-red-500 hover:text-red-500"
          onclick={() => editor.removeField(field)}
          aria-label={`Delete ${field.label}`}
          data-testid="stat-sheet-editor-delete"
        >
          <span class="icon-[lucide--trash-2] h-3.5 w-3.5" aria-hidden="true"
          ></span>
        </button>
      </div>

      <div class="flex items-center gap-2 text-micro text-theme-muted">
        <label
          for={`field-key-${field.id}`}
          class="shrink-0 font-bold uppercase tracking-wider"
        >
          Key
        </label>
        <input
          id={`field-key-${field.id}`}
          type="text"
          class="w-36 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 font-mono text-meta text-theme-text"
          value={field.key ?? ""}
          placeholder={slugifyFieldKey(field.label)}
          aria-label={`Reference key for ${field.label}`}
          aria-invalid={editor.keyErrors[field.id] ? "true" : undefined}
          aria-describedby={editor.keyErrors[field.id]
            ? `field-key-error-${field.id}`
            : undefined}
          oninput={(e) =>
            editor.handleKeyInput(field, (e.target as HTMLInputElement).value)}
        />
        <span
          class="min-w-0 flex-1 truncate font-mono text-theme-muted/70"
          title={`Internal ID: ${field.id} (stable, never shown in references)`}
        >
          {field.id}
        </span>
        {#if editor.keyErrors[field.id]}
          <span
            id={`field-key-error-${field.id}`}
            role="alert"
            class="text-red-500"
          >
            {editor.keyErrors[field.id]}
          </span>
        {/if}
      </div>

      {#if field.type === "counter"}
        <div class="flex items-center gap-2 text-micro text-theme-muted">
          <label class="flex items-center gap-1">
            Min
            <input
              type="number"
              class="w-16 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
              value={field.min ?? ""}
              oninput={(e) =>
                editor.updateField(field.id, {
                  min:
                    (e.target as HTMLInputElement).value === ""
                      ? undefined
                      : Number((e.target as HTMLInputElement).value),
                })}
              onchange={() => editor.clampCounterToBounds(field.id)}
            />
          </label>
          <label class="flex items-center gap-1">
            Max
            <input
              type="number"
              class="w-16 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
              value={field.max ?? ""}
              oninput={(e) =>
                editor.updateField(field.id, {
                  max:
                    (e.target as HTMLInputElement).value === ""
                      ? undefined
                      : Number((e.target as HTMLInputElement).value),
                })}
              onchange={() => editor.clampCounterToBounds(field.id)}
            />
          </label>
          <label class="flex items-center gap-1">
            Step
            <input
              type="number"
              class="w-16 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
              value={field.step ?? 1}
              oninput={(e) =>
                editor.updateField(field.id, {
                  step: Number((e.target as HTMLInputElement).value) || 1,
                })}
            />
          </label>
        </div>
      {:else if field.type === "dice"}
        <div class="flex items-center gap-3 text-micro text-theme-muted">
          <label class="flex items-center gap-1">
            Target
            <input
              type="number"
              class="w-20 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
              placeholder="e.g. 50"
              value={typeof field.value === "number" ? field.value : ""}
              oninput={(e) =>
                editor.updateField(field.id, {
                  value:
                    (e.target as HTMLInputElement).value === ""
                      ? undefined
                      : Number((e.target as HTMLInputElement).value),
                })}
            />
          </label>
          <label class="flex items-center gap-1">
            Formula
            <input
              type="text"
              class="w-32 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
              placeholder="1d100"
              value={field.formula ?? ""}
              oninput={(e) =>
                editor.updateField(field.id, {
                  formula: (e.target as HTMLInputElement).value,
                })}
              onchange={() =>
                editor.persist(applyTypedFormula(editor.fields, field.id))}
            />
          </label>
        </div>
      {:else if field.type === "dice-pool"}
        <div
          class="flex flex-wrap items-center gap-3 text-micro text-theme-text"
          data-testid="stat-sheet-editor-dice-pool"
        >
          <label class="flex items-center gap-1">
            Count
            <input
              type="number"
              step="1"
              aria-label={`Default pool count for ${field.label}`}
              class="w-16 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
              min="0"
              max="1000"
              value={typeof field.startValue === "number"
                ? field.startValue
                : typeof field.value === "number"
                  ? field.value
                  : 3}
              oninput={(e) => {
                const raw = (e.target as HTMLInputElement).value;
                const val =
                  raw === ""
                    ? 0
                    : Math.max(0, Math.min(1000, Math.floor(Number(raw)) || 0));
                editor.updateField(field.id, {
                  value: val,
                  startValue: val,
                });
              }}
              onchange={() => editor.clampCounterToBounds(field.id)}
            />
          </label>
          <label class="flex items-center gap-1">
            Die
            <select
              aria-label={`Die type for ${field.label}`}
              class="rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
              value={field.formula || "d6"}
              onchange={(e) =>
                editor.updateField(field.id, {
                  formula: (e.target as HTMLSelectElement).value,
                })}
            >
              {#each ["d4", "d6", "d8", "d10", "d12", "d20", "d100"] as d}
                <option value={d}>{d}</option>
              {/each}
            </select>
          </label>
          <label class="flex items-center gap-1">
            Min
            <input
              type="number"
              step="1"
              aria-label={`Min pool count for ${field.label}`}
              class="w-14 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
              value={field.min ?? 0}
              oninput={(e) =>
                editor.updateField(field.id, {
                  min:
                    (e.target as HTMLInputElement).value === ""
                      ? undefined
                      : Math.floor(
                          Number((e.target as HTMLInputElement).value),
                        ),
                })}
              onchange={() => editor.clampCounterToBounds(field.id)}
            />
          </label>
          <label class="flex items-center gap-1">
            Max
            <input
              type="number"
              step="1"
              aria-label={`Max pool count for ${field.label}`}
              class="w-14 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
              value={field.max ?? ""}
              oninput={(e) =>
                editor.updateField(field.id, {
                  max:
                    (e.target as HTMLInputElement).value === ""
                      ? undefined
                      : Math.floor(
                          Number((e.target as HTMLInputElement).value),
                        ),
                })}
              onchange={() => editor.clampCounterToBounds(field.id)}
            />
          </label>
          <label class="flex items-center gap-1">
            Step
            <input
              type="number"
              min="1"
              max="1000"
              aria-label={`Step size for ${field.label}`}
              class="w-14 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
              value={field.step ?? 1}
              oninput={(e) => {
                const raw = (e.target as HTMLInputElement).value;
                const step =
                  raw === ""
                    ? 1
                    : Math.max(1, Math.floor(Math.abs(Number(raw) || 1)));
                editor.updateField(field.id, { step });
              }}
            />
          </label>
          <label class="flex items-center gap-1.5">
            <input
              type="checkbox"
              aria-label={`Allow player to change die type for ${field.label}`}
              checked={field.allowDieChange ?? true}
              onchange={(e) =>
                editor.updateField(field.id, {
                  allowDieChange: (e.target as HTMLInputElement).checked,
                })}
            />
            Selectable die
          </label>
        </div>
      {:else if field.type === "item-table"}
        <div class="flex flex-col gap-1.5 text-micro text-theme-muted">
          <label class="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={field.linkVaultItems ?? true}
              onchange={(e) =>
                editor.updateField(field.id, {
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
                editor.updateField(field.id, {
                  stockLedger: (e.target as HTMLInputElement).checked,
                })}
            />
            Merchant stock ledger (quantity, shop price, availability)
          </label>
          {#each tableColumns(field) as col, colIndex (col.id)}
            <div
              class="flex flex-col gap-1 rounded border border-theme-border/40 p-1.5"
            >
              <div class="flex items-center gap-1.5">
                <input
                  type="text"
                  class="flex-1 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
                  aria-label={`Label for column ${colIndex + 1}`}
                  value={col.label}
                  oninput={(e) =>
                    updateColumn(field, col.id, {
                      label: (e.target as HTMLInputElement).value,
                    })}
                />
                <select
                  class="rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
                  aria-label={`Type for column ${colIndex + 1}`}
                  value={col.type}
                  onchange={(e) =>
                    updateColumn(field, col.id, {
                      type: (e.target as HTMLSelectElement)
                        .value as (typeof COLUMN_TYPES)[number]["value"],
                    })}
                >
                  {#each COLUMN_TYPES as t (t.value)}
                    <option value={t.value}>{t.label}</option>
                  {/each}
                </select>
                <button
                  type="button"
                  class="flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
                  onclick={() => moveColumn(field, colIndex, -1)}
                  disabled={colIndex === 0}
                  aria-label={`Move column ${col.label} left`}
                >
                  <span
                    class="icon-[lucide--chevron-up] h-3 w-3"
                    aria-hidden="true"
                  ></span>
                </button>
                <button
                  type="button"
                  class="flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
                  onclick={() => moveColumn(field, colIndex, 1)}
                  disabled={colIndex === tableColumns(field).length - 1}
                  aria-label={`Move column ${col.label} right`}
                >
                  <span
                    class="icon-[lucide--chevron-down] h-3 w-3"
                    aria-hidden="true"
                  ></span>
                </button>
                <button
                  type="button"
                  class="flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-red-500 hover:text-red-500"
                  onclick={() => removeColumn(field, col.id)}
                  aria-label={`Delete column ${col.label}`}
                >
                  <span
                    class="icon-[lucide--trash-2] h-3 w-3"
                    aria-hidden="true"
                  ></span>
                </button>
              </div>
              {#if col.type === "dice"}
                <label class="flex items-center gap-1.5 pl-1">
                  Formula
                  <input
                    type="text"
                    class="w-24 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
                    aria-label={`Formula for column ${colIndex + 1}`}
                    placeholder="1d6"
                    value={col.formula ?? ""}
                    oninput={(e) =>
                      updateColumn(field, col.id, {
                        formula: (e.target as HTMLInputElement).value,
                      })}
                  />
                </label>
              {:else if col.type === "counter"}
                <div class="flex items-center gap-2 pl-1">
                  <label class="flex items-center gap-1">
                    Min
                    <input
                      type="number"
                      class="w-14 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
                      aria-label={`Min for column ${colIndex + 1}`}
                      value={col.min ?? ""}
                      oninput={(e) =>
                        updateColumn(field, col.id, {
                          min:
                            (e.target as HTMLInputElement).value === ""
                              ? undefined
                              : Number((e.target as HTMLInputElement).value),
                        })}
                    />
                  </label>
                  <label class="flex items-center gap-1">
                    Max
                    <input
                      type="number"
                      class="w-14 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
                      aria-label={`Max for column ${colIndex + 1}`}
                      value={col.max ?? ""}
                      oninput={(e) =>
                        updateColumn(field, col.id, {
                          max:
                            (e.target as HTMLInputElement).value === ""
                              ? undefined
                              : Number((e.target as HTMLInputElement).value),
                        })}
                    />
                  </label>
                  <label class="flex items-center gap-1">
                    Step
                    <input
                      type="number"
                      class="w-14 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
                      aria-label={`Step for column ${colIndex + 1}`}
                      value={col.step ?? 1}
                      oninput={(e) =>
                        updateColumn(field, col.id, {
                          step:
                            Number((e.target as HTMLInputElement).value) || 1,
                        })}
                    />
                  </label>
                </div>
              {/if}
            </div>
          {/each}
          <button
            type="button"
            class="self-start rounded border border-theme-border px-2 py-0.5 text-micro font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
            onclick={() => addColumn(field)}
          >
            + Add Column
          </button>
        </div>
      {/if}
    </div>
  {/each}

  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
        onclick={editor.addField}
        data-testid="stat-sheet-editor-add"
      >
        + Add Field
      </button>
      {#if editor.fields.length > 0}
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-red-500 hover:text-red-500"
          onclick={editor.clearAllFields}
          data-testid="stat-sheet-editor-clear-all"
        >
          Clear All
        </button>
      {/if}
    </div>
    <button
      type="button"
      class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
      onclick={onClose}
      data-testid="stat-sheet-editor-close"
    >
      Done
    </button>
  </div>
</div>
