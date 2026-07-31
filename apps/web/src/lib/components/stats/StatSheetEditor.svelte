<script lang="ts">
  import type { Entity, StatSheetField, StatSheetFieldType } from "schema";
  import { untrack } from "svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { notificationStore } from "$lib/stores/ui/notification.svelte";

  let { entity, onClose = () => {} } = $props<{
    entity: Entity;
    onClose?: () => void;
  }>();

  const FIELD_TYPES: { value: StatSheetFieldType; label: string }[] = [
    { value: "counter", label: "Counter" },
    { value: "number", label: "Number" },
    { value: "text", label: "Text" },
    { value: "longtext", label: "Long Text" },
    { value: "heading", label: "Section Heading" },
    { value: "dice", label: "Dice Roll" },
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
      },
    });
  }

  function addField() {
    const id = `field-${crypto.randomUUID()}`;
    persist([
      ...fields,
      { id, label: "New Field", type: "text" as StatSheetFieldType },
    ]);
  }

  function updateField(id: string, updates: Partial<StatSheetField>) {
    persist(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
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
</script>

<div class="flex flex-col gap-3" data-testid="stat-sheet-editor">
  {#each fields as field, index (`${field.id}-${index}`)}
    <div
      class="flex flex-col gap-2 rounded border border-theme-border p-2"
      data-testid="stat-sheet-editor-field"
    >
      <div class="flex items-center gap-2">
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
            updateField(field.id, {
              type: (e.target as HTMLSelectElement).value as StatSheetFieldType,
            })}
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
        <label class="flex items-center gap-2 text-[10px] text-theme-muted">
          Formula
          <input
            type="text"
            class="w-32 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
            placeholder="1d20+5"
            value={field.formula ?? ""}
            oninput={(e) =>
              updateField(field.id, {
                formula: (e.target as HTMLInputElement).value,
              })}
          />
        </label>
      {/if}
    </div>
  {/each}

  <div class="flex items-center justify-between">
    <button
      type="button"
      class="rounded border border-theme-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-theme-muted hover:border-theme-primary hover:text-theme-primary"
      onclick={addField}
      data-testid="stat-sheet-editor-add"
    >
      + Add Field
    </button>
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
