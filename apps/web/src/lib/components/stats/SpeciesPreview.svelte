<script lang="ts">
  import type { Trait } from "schema";
  import type { TraitAdjustmentPreview } from "@codex/stat-sheet-engine";
  import SpeciesTraitList from "./SpeciesTraitList.svelte";

  let { traits, rows }: { traits: Trait[]; rows: TraitAdjustmentPreview[] } =
    $props();

  const formatAmount = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  function describe(row: TraitAdjustmentPreview): string {
    const head = `${row.traitName}: `;
    const amount = formatAmount(row.amount);
    if (row.status === "applied") {
      return `${head}${row.fieldLabel} ${amount} (${row.base} → ${row.effective})`;
    }
    const reason =
      row.status === "missing"
        ? "no field with this key"
        : "field is not a number field";
    return `${head}${row.target} ${amount} · Not applied (${reason})`;
  }
</script>

<div class="flex flex-col gap-1" data-testid="species-preview">
  <SpeciesTraitList {traits} />
  {#each rows as row, i (i)}
    <div class="text-xs text-theme-text" data-testid="species-preview-row">
      {describe(row)}
    </div>
  {/each}
</div>
