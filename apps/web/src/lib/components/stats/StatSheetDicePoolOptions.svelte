<script lang="ts">
  import type { StatSheetField } from "schema";
  import { parseOptionalNumber } from "./stat-sheet-editor-input.js";
  let {
    field,
    onUpdate,
    onBoundsCommit,
  }: {
    field: StatSheetField;
    onUpdate: (updates: Partial<StatSheetField>) => void;
    onBoundsCommit: () => void;
  } = $props();
</script>

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
        onUpdate({
          value: val,
          startValue: val,
        });
      }}
      onchange={() => onBoundsCommit()}
    />
  </label>
  <label class="flex items-center gap-1">
    Die
    <select
      aria-label={`Die type for ${field.label}`}
      class="rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text"
      value={field.formula || "d6"}
      onchange={(e) =>
        onUpdate({
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
        onUpdate({
          min: parseOptionalNumber(e.currentTarget.value, true),
        })}
      onchange={() => onBoundsCommit()}
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
        onUpdate({
          max: parseOptionalNumber(e.currentTarget.value, true),
        })}
      onchange={() => onBoundsCommit()}
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
          raw === "" ? 1 : Math.max(1, Math.floor(Math.abs(Number(raw) || 1)));
        onUpdate({ step });
      }}
    />
  </label>
  <label class="flex items-center gap-1.5">
    <input
      type="checkbox"
      aria-label={`Allow player to change die type for ${field.label}`}
      checked={field.allowDieChange ?? true}
      onchange={(e) =>
        onUpdate({
          allowDieChange: (e.target as HTMLInputElement).checked,
        })}
    />
    Selectable die
  </label>
</div>
