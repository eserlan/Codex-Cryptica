<script lang="ts">
  import type { Entity, TraitSelection } from "schema";
  import SpeciesPicker from "./SpeciesPicker.svelte";
  import SpeciesCurrentSelection from "./SpeciesCurrentSelection.svelte";
  import { vault } from "#lib/stores/vault.svelte.js";
  import {
    isSpeciesDefinition,
    previewTraitSelection,
    removeTraitSelection,
    setTraitSelection,
  } from "@codex/stat-sheet-engine";

  let {
    entity,
    now = () => Date.now(),
  }: { entity: Entity; now?: () => number } = $props();

  const readOnly = $derived(vault.isGuest);
  const current = $derived(
    entity.traitSelections?.find((s) => s.kind === "species"),
  );
  const species = $derived(
    vault.allEntities
      .filter((e: Entity) => isSpeciesDefinition(e))
      .sort((a: Entity, b: Entity) => a.title.localeCompare(b.title)),
  );
  const sourceAvailable = $derived(
    !!current &&
      vault.allEntities.some((e: Entity) => e.id === current.sourceId),
  );

  let picking = $state(false);
  let chosenId = $state("");
  const chosen = $derived(
    species.find((e: Entity) => e.id === chosenId) ?? null,
  );
  const preview = $derived(
    chosen
      ? previewTraitSelection(
          entity.statSheet?.fields ?? [],
          chosen.traitPackage?.traits ?? [],
        )
      : [],
  );

  function startPicking() {
    chosenId = "";
    picking = true;
  }

  function cancel() {
    picking = false;
    chosenId = "";
  }

  async function apply() {
    if (!chosen) return;
    const selection: TraitSelection = {
      kind: "species",
      sourceId: chosen.id,
      sourceTitle: chosen.title,
      appliedAt: now(),
      traits: structuredClone(
        $state.snapshot(chosen.traitPackage?.traits ?? []),
      ),
    };
    await vault.updateEntity(entity.id, {
      traitSelections: setTraitSelection(
        $state.snapshot(entity.traitSelections ?? []),
        selection,
      ),
    });
    cancel();
  }

  async function remove() {
    await vault.updateEntity(entity.id, {
      traitSelections: removeTraitSelection(
        $state.snapshot(entity.traitSelections ?? []),
        "species",
      ),
    });
  }
</script>

<div
  class="flex flex-col gap-2 rounded border border-theme-border p-2"
  data-testid="species-selection-panel"
>
  <span class="text-micro font-bold uppercase tracking-widest text-theme-text">
    Species/Ancestry
  </span>

  {#if current && !picking}
    <SpeciesCurrentSelection
      {current}
      {sourceAvailable}
      {readOnly}
      onOpenSource={() => (vault.selectedEntityId = current.sourceId)}
      onChange={startPicking}
      onRemove={remove}
    />
  {:else if !readOnly}
    {#if !picking}
      <button
        type="button"
        class="self-start rounded border border-theme-border px-2 py-1 text-micro font-bold uppercase text-theme-text hover:border-theme-primary hover:text-theme-primary"
        onclick={startPicking}
        data-testid="species-choose"
      >
        Choose species
      </button>
    {:else}
      <SpeciesPicker
        {species}
        bind:chosenId
        {chosen}
        {preview}
        onApply={apply}
        onCancel={cancel}
      />
    {/if}
  {:else}
    <span class="text-xs text-theme-text">No species selected.</span>
  {/if}
</div>
