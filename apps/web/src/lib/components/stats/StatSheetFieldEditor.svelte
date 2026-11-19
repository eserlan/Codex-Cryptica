<script lang="ts">
  /* eslint-disable svelte/no-useless-mustaches -- Class expressions keep review notes on inherited colours. */
  import type { StatSheetField, StatSheetFieldType } from "schema";
  import type { IdGenerator } from "#lib/utils/runtime-deps.js";
  import { slugifyFieldKey } from "@codex/stat-sheet-engine";
  import { applyTypedFormula } from "#lib/utils/stat-sheet-field-actions.js";
  import type { StatSheetEditorState } from "./StatSheetEditorState.svelte.js";
  import StatSheetNumericOptions from "./StatSheetNumericOptions.svelte";
  import StatSheetDicePoolOptions from "./StatSheetDicePoolOptions.svelte";
  import StatSheetTableOptions from "./StatSheetTableOptions.svelte";
  let {
    field,
    index,
    fieldCount,
    editor,
    idGenerator,
    onMove,
  }: {
    field: StatSheetField;
    index: number;
    fieldCount: number;
    editor: StatSheetEditorState;
    idGenerator: IdGenerator;
    onMove: (direction: -1 | 1) => void;
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
</script>

<div class="flex items-center gap-2">
  <button
    type="button"
    class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
    "flex items-center cursor-grab active:cursor-grabbing text-theme-muted hover:text-theme-primary p-0.5 shrink-0 rounded focus:outline-none focus:ring-1 focus:ring-theme-primary"}
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
    class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
    "flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"}
    onclick={() => onMove(-1)}
    disabled={index === 0}
    aria-label={`Move ${field.label} up`}
  >
    <span class="icon-[lucide--chevron-up] h-3.5 w-3.5" aria-hidden="true"
    ></span>
  </button>
  <button
    type="button"
    class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
    "flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"}
    onclick={() => onMove(1)}
    disabled={index === fieldCount - 1}
    aria-label={`Move ${field.label} down`}
  >
    <span class="icon-[lucide--chevron-down] h-3.5 w-3.5" aria-hidden="true"
    ></span>
  </button>
  <button
    type="button"
    class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
    "flex h-6 w-6 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-red-500 hover:text-red-500"}
    onclick={() => editor.removeField(field)}
    aria-label={`Delete ${field.label}`}
    data-testid="stat-sheet-editor-delete"
  >
    <span class="icon-[lucide--trash-2] h-3.5 w-3.5" aria-hidden="true"></span>
  </button>
</div>

<div
  class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
  "flex items-center gap-2 text-micro text-theme-muted"}
>
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
    class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
    "min-w-0 flex-1 truncate font-mono text-theme-muted/70"}
    title={`Internal ID: ${field.id} (stable, never shown in references)`}
  >
    {field.id}
  </span>
  {#if editor.keyErrors[field.id]}
    <span id={`field-key-error-${field.id}`} role="alert" class="text-red-500">
      {editor.keyErrors[field.id]}
    </span>
  {/if}
</div>

{#if field.type === "counter" || field.type === "dice"}
  <StatSheetNumericOptions
    {field}
    onUpdate={(updates) => editor.updateField(field.id, updates)}
    onBoundsCommit={() => editor.clampCounterToBounds(field.id)}
    onFormulaCommit={() =>
      editor.persist(applyTypedFormula(editor.fields, field.id))}
  />
{:else if field.type === "dice-pool"}
  <StatSheetDicePoolOptions
    {field}
    onUpdate={(updates) => editor.updateField(field.id, updates)}
    onBoundsCommit={() => editor.clampCounterToBounds(field.id)}
  />
{:else if field.type === "item-table"}
  <StatSheetTableOptions
    {field}
    {idGenerator}
    onUpdate={(updates) => editor.updateField(field.id, updates)}
  />
{/if}
