<script lang="ts">
  import type { Entity } from "schema";
  import type { TraitAdjustmentPreview } from "@codex/stat-sheet-engine";
  import SpeciesPreview from "./SpeciesPreview.svelte";

  let {
    species,
    chosenId = $bindable(""),
    chosen,
    preview,
    onApply,
    onCancel,
  }: {
    species: Entity[];
    chosenId?: string;
    chosen: Entity | null;
    preview: TraitAdjustmentPreview[];
    onApply: () => void;
    onCancel: () => void;
  } = $props();
</script>

{#if species.length === 0}
  <p class="text-xs text-theme-text" data-testid="species-empty">
    No species yet. Mark a Creature as a Species/Ancestry definition in its
    Stats tab.
  </p>
{:else}
  <select
    class="rounded border border-theme-border bg-theme-bg px-1.5 py-1 text-xs text-theme-text"
    aria-label="Species"
    bind:value={chosenId}
    data-testid="species-picker"
  >
    <option value="">Select a species…</option>
    {#each species as option (option.id)}
      <option value={option.id}>{option.title}</option>
    {/each}
  </select>
{/if}

{#if chosen}
  <SpeciesPreview traits={chosen.traitPackage?.traits ?? []} rows={preview} />
{/if}

<div class="flex gap-2">
  <button
    type="button"
    class="rounded border border-theme-primary bg-theme-primary px-2 py-1 text-micro font-bold uppercase text-theme-on-primary disabled:opacity-40"
    disabled={!chosen}
    onclick={onApply}
    data-testid="species-apply"
  >
    Apply
  </button>
  <button
    type="button"
    class="rounded border border-theme-border px-2 py-1 text-micro font-bold uppercase text-theme-text"
    onclick={onCancel}
    data-testid="species-cancel"
  >
    Cancel
  </button>
</div>
