<script lang="ts">
  import type { Entity, StatSheetField, StatSheetFieldType } from "schema";
  import { untrack } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";
  import { type IdGenerator, systemIdGenerator } from "$lib/utils/runtime-deps";

  let {
    entity,
    onClose = () => {},
    idGenerator = systemIdGenerator,
  } = $props<{
    entity: Entity;
    onClose?: () => void;
    idGenerator?: IdGenerator;
  }>();

  const FIELD_TYPES: { value: StatSheetFieldType; label: string }[] = [
    { value: "counter", label: "Counter" },
    { value: "number", label: "Number" },
    { value: "text", label: "Text" },
    { value: "longtext", label: "Long Text" },
    { value: "heading", label: "Section Heading" },
    { value: "dice", label: "Dice Roll" },
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
  ];

  const DEFAULT_ITEM_TABLE_COLUMNS: NonNullable<StatSheetField["columns"]> = [
    { id: "name", label: "Weapon Type", type: "text" },
    { id: "size", label: "Size", type: "text" },
    { id: "reach", label: "Reach (Force)", type: "text" },
    { id: "damage", label: "Damage", type: "dice" },
    { id: "ap_hp", label: "AP/HP", type: "text" },
    { id: "effects", label: "Special Effects", type: "text" },
    { id: "range_load", label: "Range & Load", type: "text" },
  ];

  let fields = $state<StatSheetField[]>(
    untrack(() => $state.snapshot(entity.statSheet?.fields ?? [])),
  );

  $effect(() => {
    fields = $state.snapshot(entity.statSheet?.fields ?? []);
  });

  function persist(nextFields: StatSheetField[]) {
    fields = nextFields;
    vault.updateEntity(entity.id, {
      statSheet: {
        templateId: entity.statSheet?.templateId ?? null,
        fields: nextFields,
        presentationTemplateId:
          entity.statSheet?.presentationTemplateId ?? null,
      },
    });
  }

  function addField() {
    const id = `field-${idGenerator.uuid()}`;
    persist([
      ...fields,
      { id, label: "New Field", type: "text" as StatSheetFieldType },
    ]);
  }

  function updateField(id: string, updates: Partial<StatSheetField>) {
    persist(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function changeFieldType(field: StatSheetField, newType: StatSheetFieldType) {
    const updates: Partial<StatSheetField> = { type: newType };
    if (newType === "item-table" && !field.columns) {
      updates.columns = DEFAULT_ITEM_TABLE_COLUMNS.map((c) => ({ ...c }));
    }
    updateField(field.id, updates);
  }

  function tableColumns(field: StatSheetField) {
    return field.columns ?? DEFAULT_ITEM_TABLE_COLUMNS;
  }

  function addColumn(field: StatSheetField) {
    const id = `col-${idGenerator.uuid()}`;
    updateField(field.id, {
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
    updateField(field.id, {
      columns: tableColumns(field).map((c) =>
        c.id === columnId ? { ...c, ...updates } : c,
      ),
    });
  }

  function removeColumn(field: StatSheetField, columnId: string) {
    updateField(field.id, {
      columns: tableColumns(field).filter((c) => c.id !== columnId),
    });
  }

  function moveColumn(field: StatSheetField, index: number, direction: -1 | 1) {
    const cols = tableColumns(field);
    const target = index + direction;
    if (target < 0 || target >= cols.length) return;
    const next = [...cols];
    [next[index], next[target]] = [next[target], next[index]];
    updateField(field.id, { columns: next });
  }

  let draggedIndex = $state<number | null>(null);
  let dragOverIndex = $state<number | null>(null);
  let selectedFieldId = $state<string | null>(null);

  function handleDragStart(e: DragEvent, index: number) {
    draggedIndex = index;
    selectedFieldId = fields[index]?.id ?? null;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    }
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    if (dragOverIndex !== index) {
      dragOverIndex = index;
    }
  }

  function handleDrop(e: DragEvent, targetIndex: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      draggedIndex = null;
      dragOverIndex = null;
      return;
    }

    const next = [...fields];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, moved);

    draggedIndex = null;
    dragOverIndex = null;
    selectedFieldId = moved.id;
    persist(next);
  }

  function handleDragEnd() {
    draggedIndex = null;
    dragOverIndex = null;
  }

  function handleFieldKeyDown(e: KeyboardEvent, index: number) {
    if ((e.altKey || e.ctrlKey) && e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      moveField(index, -1);
    } else if ((e.altKey || e.ctrlKey) && e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      moveField(index, 1);
    }
  }

  function handleContainerKeyDown(e: KeyboardEvent) {
    if (
      (e.altKey || e.ctrlKey) &&
      (e.key === "ArrowUp" || e.key === "ArrowDown")
    ) {
      if (!selectedFieldId) return;
      const index = fields.findIndex((f) => f.id === selectedFieldId);
      if (index === -1) return;
      e.preventDefault();
      e.stopPropagation();
      moveField(index, e.key === "ArrowUp" ? -1 : 1);
    }
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const movedId = fields[index].id;
    selectedFieldId = movedId;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);

    requestAnimationFrame(() => {
      const handle = document.querySelector<HTMLElement>(
        `[data-field-id="${movedId}"] [data-testid="stat-sheet-drag-handle"]`,
      );
      handle?.focus();
    });
  }

  function hasNonDefaultValue(field: StatSheetField): boolean {
    if (field.type === "heading") return false;
    if (field.value === undefined) return false;
    if (field.value === "" || field.value === 0) return false;
    return true;
  }

  async function removeField(field: StatSheetField) {
    if (hasNonDefaultValue(field)) {
      const confirmed = await notificationStore.confirm({
        title: "Delete Field",
        message: `"${field.label}" contains a value. Delete it anyway?`,
        confirmLabel: "Delete",
        isDangerous: true,
      });
      if (!confirmed) return;
    }
    persist(fields.filter((f) => f.id !== field.id));
  }

  async function clearAllFields() {
    const confirmed = await notificationStore.confirm({
      title: "Clear Stat Sheet",
      message: `Remove all ${fields.length} stat fields and template assignment from "${entity.title}"?`,
      confirmLabel: "Clear All",
      isDangerous: true,
    });
    if (!confirmed) return;

    persist([]);
    vault.updateEntity(entity.id, {
      statSheet: { templateId: null, fields: [] },
    });
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="flex flex-col gap-3 outline-none"
  tabindex="0"
  onkeydown={handleContainerKeyDown}
  data-testid="stat-sheet-editor"
>
  {#each fields as field, index (field.id)}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="flex flex-col gap-2 rounded border p-2 transition-colors {draggedIndex ===
      index
        ? 'opacity-40 border-dashed border-theme-primary'
        : dragOverIndex === index
          ? 'border-theme-primary bg-theme-primary/10 ring-1 ring-theme-primary'
          : selectedFieldId === field.id
            ? 'border-theme-primary bg-theme-primary/10 ring-2 ring-theme-primary/40'
            : 'border-theme-border'}"
      draggable="true"
      ondragstart={(e) => handleDragStart(e, index)}
      ondragover={(e) => handleDragOver(e, index)}
      ondragleave={() => (dragOverIndex = null)}
      ondrop={(e) => handleDrop(e, index)}
      ondragend={handleDragEnd}
      onkeydown={(e) => handleFieldKeyDown(e, index)}
      onfocusin={() => (selectedFieldId = field.id)}
      onclick={() => (selectedFieldId = field.id)}
      data-field-id={field.id}
      data-selected={selectedFieldId === field.id ? "true" : "false"}
      aria-selected={selectedFieldId === field.id}
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
            updateField(field.id, {
              label: (e.target as HTMLInputElement).value,
            })}
        />
        <select
          class="rounded border border-theme-border bg-theme-bg px-1.5 py-1 text-xs text-theme-text"
          value={field.type}
          aria-label="Field type"
          onchange={(e) =>
            changeFieldType(
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
          onclick={() => moveField(index, -1)}
          disabled={index === 0}
          aria-label={`Move ${field.label} up`}
        >
          <span class="icon-[lucide--chevron-up] h-3.5 w-3.5" aria-hidden="true"
          ></span>
        </button>
        <button
          type="button"
          class="flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
          onclick={() => moveField(index, 1)}
          disabled={index === fields.length - 1}
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
          onclick={() => removeField(field)}
          aria-label={`Delete ${field.label}`}
          data-testid="stat-sheet-editor-delete"
        >
          <span class="icon-[lucide--trash-2] h-3.5 w-3.5" aria-hidden="true"
          ></span>
        </button>
      </div>

      {#if field.type === "counter"}
        <div class="flex items-center gap-2 text-[10px] text-theme-muted">
          <label class="flex items-center gap-1">
            Min
            <input
              type="number"
              class="w-16 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
              value={field.min ?? ""}
              oninput={(e) =>
                updateField(field.id, {
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
              class="w-16 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
              value={field.max ?? ""}
              oninput={(e) =>
                updateField(field.id, {
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
              class="w-16 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
              value={field.step ?? 1}
              oninput={(e) =>
                updateField(field.id, {
                  step: Number((e.target as HTMLInputElement).value) || 1,
                })}
            />
          </label>
        </div>
      {:else if field.type === "dice"}
        <div class="flex items-center gap-3 text-[10px] text-theme-muted">
          <label class="flex items-center gap-1">
            Target
            <input
              type="number"
              class="w-20 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
              placeholder="e.g. 50"
              value={typeof field.value === "number" ? field.value : ""}
              oninput={(e) =>
                updateField(field.id, {
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
                updateField(field.id, {
                  formula: (e.target as HTMLInputElement).value,
                })}
            />
          </label>
        </div>
      {:else if field.type === "item-table"}
        <div class="flex flex-col gap-1.5 text-[10px] text-theme-muted">
          <label class="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={field.linkVaultItems ?? true}
              onchange={(e) =>
                updateField(field.id, {
                  linkVaultItems: (e.target as HTMLInputElement).checked,
                })}
            />
            Allow linking rows to vault items
          </label>
          {#each tableColumns(field) as col, colIndex (col.id)}
            <div class="flex items-center gap-1.5">
              <input
                type="text"
                class="flex-1 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
                aria-label="Column label"
                value={col.label}
                oninput={(e) =>
                  updateColumn(field, col.id, {
                    label: (e.target as HTMLInputElement).value,
                  })}
              />
              <select
                class="rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
                aria-label="Column type"
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
                <span class="icon-[lucide--trash-2] h-3 w-3" aria-hidden="true"
                ></span>
              </button>
            </div>
          {/each}
          <button
            type="button"
            class="self-start rounded border border-theme-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
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
        onclick={addField}
        data-testid="stat-sheet-editor-add"
      >
        + Add Field
      </button>
      {#if fields.length > 0}
        <button
          type="button"
          class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-red-500 hover:text-red-500"
          onclick={clearAllFields}
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
