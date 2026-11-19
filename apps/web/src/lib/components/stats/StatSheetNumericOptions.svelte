<script lang="ts">
  /* eslint-disable svelte/no-useless-mustaches -- Class expressions keep review notes on inherited colours. */
  import type { StatSheetField } from "schema";
  import { parseOptionalNumber } from "./stat-sheet-editor-input.js";
  let {
    field,
    onUpdate,
    onBoundsCommit,
    onFormulaCommit,
  }: {
    field: StatSheetField;
    onUpdate: (updates: Partial<StatSheetField>) => void;
    onBoundsCommit: () => void;
    onFormulaCommit: () => void;
  } = $props();
</script>

{#if field.type === "counter"}
  <div
    class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
    "flex items-center gap-2 text-micro text-theme-muted"}
  >
    <label class="flex items-center gap-1">
      Min
      <input
        type="number"
        class="w-16 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
        value={field.min ?? ""}
        oninput={(e) =>
          onUpdate({
            min: parseOptionalNumber(e.currentTarget.value),
          })}
        onchange={() => onBoundsCommit()}
      />
    </label>
    <label class="flex items-center gap-1">
      Max
      <input
        type="number"
        class="w-16 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
        value={field.max ?? ""}
        oninput={(e) =>
          onUpdate({
            max: parseOptionalNumber(e.currentTarget.value),
          })}
        onchange={() => onBoundsCommit()}
      />
    </label>
    <label class="flex items-center gap-1">
      Step
      <input
        type="number"
        class="w-16 rounded border border-theme-border bg-theme-bg px-1 py-0.5 text-xs text-theme-text"
        value={field.step ?? 1}
        oninput={(e) =>
          onUpdate({
            step: Number((e.target as HTMLInputElement).value) || 1,
          })}
      />
    </label>
  </div>
{:else if field.type === "dice"}
  <div
    class={// ui-check-ignore: Existing StatSheetEditor colours preserved for this behaviour-only extraction.
    "flex items-center gap-3 text-micro text-theme-muted"}
  >
    <label class="flex items-center gap-1">
      Target
      <input
        type="number"
        class="w-20 rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
        placeholder="e.g. 50"
        value={typeof field.value === "number" ? field.value : ""}
        oninput={(e) =>
          onUpdate({
            value: parseOptionalNumber(e.currentTarget.value),
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
          onUpdate({
            formula: (e.target as HTMLInputElement).value,
          })}
        onchange={() => onFormulaCommit()}
      />
    </label>
  </div>
{/if}
