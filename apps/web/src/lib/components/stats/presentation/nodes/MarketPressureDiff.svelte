<script lang="ts">
  import {
    formatMoney,
    skipText,
    type PlannedRow,
  } from "@codex/stat-sheet-engine";

  /** The reviewable diff for a market change (#3966). Nothing is saved here. */
  let {
    plan,
    chosen,
    onToggle,
  }: {
    plan: PlannedRow[];
    chosen: Record<string, boolean>;
    onToggle: (rowId: string, on: boolean) => void;
  } = $props();

  const isOn = (row: PlannedRow) => !row.skipped && (chosen[row.rowId] ?? true);
  const money = (amount: {
    units: number;
    currency: string;
    precision: number;
  }) => formatMoney(amount);
</script>

<ul class="space-y-1" aria-label="Proposed changes" data-testid="market-diff">
  {#each plan as row (row.rowId)}
    <li
      class="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded border border-theme-border/40 px-2 py-1"
      class:opacity-60={!!row.skipped}
      data-testid="market-diff-row"
    >
      <label class="flex min-w-40 flex-1 items-center gap-2">
        <input
          type="checkbox"
          class="h-3.5 w-3.5 rounded border-theme-border text-theme-primary"
          checked={isOn(row)}
          disabled={!!row.skipped}
          onchange={(event) =>
            onToggle(row.rowId, (event.target as HTMLInputElement).checked)}
          aria-label={`Change ${row.name}`}
        />
        <span class="font-bold">{row.name}</span>
      </label>
      {#if row.skipped}
        <span class="text-micro italic text-theme-muted">
          {skipText(row.skipped)}
        </span>
      {:else}
        {#if row.change.price}
          <span class="font-mono">
            {money(row.change.price.before)} → {money(row.change.price.after)}
          </span>
        {/if}
        {#if row.change.quantity}
          <span class="font-mono">
            ×{row.change.quantity.before} → ×{row.change.quantity.after}
          </span>
        {/if}
        {#if row.change.availability}
          <span class="font-mono">
            {row.change.availability.before ?? "available"} → {row.change
              .availability.after}
          </span>
        {/if}
      {/if}
    </li>
  {/each}
</ul>
