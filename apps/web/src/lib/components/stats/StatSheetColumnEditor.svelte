<script lang="ts">
  /* eslint-disable svelte/no-useless-mustaches -- Class expressions keep review notes on inherited colours. */
  import type { StatSheetField } from "schema";
  import { parseOptionalNumber } from "./stat-sheet-editor-input.js";
  type Column = NonNullable<StatSheetField["columns"]>[number];
  let {
    col,
    colIndex,
    columnCount,
    onUpdate,
    onMove,
    onRemove,
  }: {
    col: Column;
    colIndex: number;
    columnCount: number;
    onUpdate: (updates: Partial<Column>) => void;
    onMove: (direction: -1 | 1) => void;
    onRemove: () => void;
  } = $props();
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
</script>

<div class="flex flex-col gap-1 rounded border border-theme-border/40 p-1.5">
  <div class="flex items-center gap-1.5">
    <input
      type="text"
      class="flex-1 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
      aria-label={`Label for column ${colIndex + 1}`}
      value={col.label}
      oninput={(e) =>
        onUpdate({
          label: (e.target as HTMLInputElement).value,
        })}
    />
    <select
      class="rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
      aria-label={`Type for column ${colIndex + 1}`}
      value={col.type}
      onchange={(e) =>
        onUpdate({
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
      class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
      "flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"}
      onclick={() => onMove(-1)}
      disabled={colIndex === 0}
      aria-label={`Move column ${col.label} left`}
    >
      <span class="icon-[lucide--chevron-up] h-3 w-3" aria-hidden="true"></span>
    </button>
    <button
      type="button"
      class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
      "flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"}
      onclick={() => onMove(1)}
      disabled={colIndex === columnCount - 1}
      aria-label={`Move column ${col.label} right`}
    >
      <span class="icon-[lucide--chevron-down] h-3 w-3" aria-hidden="true"
      ></span>
    </button>
    <button
      type="button"
      class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
      "flex h-5 w-5 items-center justify-center rounded border border-theme-border text-theme-muted hover:border-red-500 hover:text-red-500"}
      onclick={() => onRemove()}
      aria-label={`Delete column ${col.label}`}
    >
      <span class="icon-[lucide--trash-2] h-3 w-3" aria-hidden="true"></span>
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
          onUpdate({
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
            onUpdate({
              min: parseOptionalNumber(e.currentTarget.value),
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
            onUpdate({
              max: parseOptionalNumber(e.currentTarget.value),
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
            onUpdate({
              step: Number((e.target as HTMLInputElement).value) || 1,
            })}
        />
      </label>
    </div>
  {/if}
</div>
