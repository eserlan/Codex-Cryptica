<script lang="ts">
  import type { StatSheetField } from "schema";
  import {
    adjustTovLuck,
    TOV_LUCK_FIXTURE,
    TOV_LUCK_REFERENCE,
  } from "@codex/stat-sheet-engine";

  let {
    field,
    readOnly = false,
    onChange,
    testIdPrefix = "tov-luck",
  }: {
    field: StatSheetField;
    readOnly?: boolean;
    onChange: (value: number) => void;
    testIdPrefix?: string;
  } = $props();

  const current = $derived(typeof field.value === "number" ? field.value : 0);
  const max = $derived(field.max ?? TOV_LUCK_FIXTURE.defaultMax);
  let notice = $state("");

  function change(delta: 1 | -1) {
    if (readOnly) return;
    const result = adjustTovLuck(current, delta, max);
    notice = result.reason ?? "";
    if (result.value !== current) onChange(result.value);
  }
</script>

<div
  class="flex flex-col gap-1 rounded border border-theme-border px-2 py-1.5"
  data-testid={testIdPrefix}
>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <span class="text-xs text-theme-text">{field.label}</span>
    <div class="ml-auto flex items-center gap-2">
      <button
        type="button"
        class="flex h-8 min-w-8 items-center justify-center gap-1 rounded border border-theme-border px-1.5 text-xs text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
        onclick={() => change(-1)}
        disabled={readOnly || current <= (field.min ?? 0)}
        aria-label="Spend 1 Luck"
        data-testid="{testIdPrefix}-spend"
      >
        <span class="icon-[lucide--minus] h-3.5 w-3.5" aria-hidden="true"
        ></span>
      </button>
      <span
        class="min-w-[3rem] text-center text-sm font-bold text-theme-text"
        data-testid="{testIdPrefix}-value"
        aria-live="polite"
      >
        {current}<span class="font-normal text-theme-muted"> / {max}</span>
      </span>
      <button
        type="button"
        class="flex h-8 min-w-8 items-center justify-center gap-1 rounded border border-theme-border px-1.5 text-xs text-theme-muted hover:border-theme-primary hover:text-theme-primary disabled:opacity-40"
        onclick={() => change(1)}
        disabled={readOnly || current >= max}
        aria-label="Gain 1 Luck"
        data-testid="{testIdPrefix}-gain"
      >
        <span class="icon-[lucide--plus] h-3.5 w-3.5" aria-hidden="true"></span>
      </button>
    </div>
  </div>
  {#if notice}
    <p class="text-micro text-theme-muted" role="status">{notice}</p>
  {/if}
  <details class="text-micro text-theme-muted">
    <summary class="cursor-pointer py-1 hover:text-theme-primary"
      >How Luck works</summary
    >
    <p>{TOV_LUCK_REFERENCE.summary}</p>
    <p>Earn: {TOV_LUCK_REFERENCE.earn}</p>
    <p>Spend: {TOV_LUCK_REFERENCE.spend}</p>
    <p>Cap: {TOV_LUCK_REFERENCE.overflow}</p>
    <p>{TOV_LUCK_REFERENCE.note}</p>
    <p>Source: {TOV_LUCK_REFERENCE.source}</p>
  </details>
</div>
