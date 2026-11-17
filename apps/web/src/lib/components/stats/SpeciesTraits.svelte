<script lang="ts">
  import type { AppliedSpecies, StatSheetField } from "schema";
  import {
    calculateSpecies,
    signedSpeciesAmount,
  } from "@codex/stat-sheet-engine";
  let {
    snapshot,
    fields,
  }: { snapshot: AppliedSpecies; fields: StatSheetField[] } = $props();
  const contributions = $derived(calculateSpecies(snapshot, fields));
</script>

<div class="space-y-2 text-sm text-theme-text" data-testid="species-traits">
  <p class="font-bold">{snapshot.source.title}</p>
  {#each snapshot.traits as trait (trait.id)}
    <div class="rounded border border-theme-border p-2">
      <p class="font-bold">{trait.name}</p>
      <p class="whitespace-pre-wrap">{trait.description}</p>
      {#each contributions.filter((row) => row.traitId === trait.id) as row}
        <p class="text-theme-text">
          {row.key}
          {signedSpeciesAmount(row.amount)} —
          {#if row.reason}Unavailable: {row.reason}
          {:else}Base {row.base}; Effective {row.effective}{/if}
        </p>
      {/each}
    </div>
  {/each}
</div>
