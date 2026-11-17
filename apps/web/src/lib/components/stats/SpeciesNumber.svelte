<script lang="ts">
  import type { AppliedSpecies, StatSheetField } from "schema";
  import {
    calculateSpecies,
    signedSpeciesAmount,
  } from "@codex/stat-sheet-engine";
  let {
    snapshot,
    fields,
    fieldId,
  }: { snapshot?: AppliedSpecies; fields: StatSheetField[]; fieldId: string } =
    $props();
  const contributions = $derived(
    calculateSpecies(snapshot, fields).filter(
      (row) => row.fieldId === fieldId && !row.reason,
    ),
  );
</script>

{#if contributions.length && snapshot}
  <span class="block text-xs text-theme-text" data-testid="species-number">
    Base {contributions[0].base}; Effective {contributions[0].effective}
    {#each contributions as row}
      <span class="block"
        >{signedSpeciesAmount(row.amount)}
        {row.traitName} ({snapshot.source.title})</span
      >
    {/each}
  </span>
{/if}
