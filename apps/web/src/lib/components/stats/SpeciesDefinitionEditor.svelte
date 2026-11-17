<script lang="ts">
  import type { Entity, Trait, TraitPackageDefinition } from "schema";
  import { vault } from "#lib/stores/vault.svelte.js";
  import {
    type IdGenerator,
    systemIdGenerator,
  } from "#lib/utils/runtime-deps.js";
  import SpeciesTraitEditor from "./SpeciesTraitEditor.svelte";

  let {
    entity,
    idGenerator = systemIdGenerator,
  }: { entity: Entity; idGenerator?: IdGenerator } = $props();

  const readOnly = $derived(vault.isGuest);
  const pkg = $derived(entity.traitPackage);

  function save(next: TraitPackageDefinition | undefined) {
    if (readOnly) return;
    vault.updateEntity(entity.id, { traitPackage: next });
  }

  function saveTraits(update: (traits: Trait[]) => Trait[]) {
    if (!pkg) return;
    save({
      ...$state.snapshot(pkg),
      traits: update(structuredClone($state.snapshot(pkg.traits))),
    });
  }

  function addTrait() {
    saveTraits((traits) => [
      ...traits,
      {
        id: idGenerator.uuid(),
        name: "New trait",
        description: "",
        adjustments: [],
      },
    ]);
  }

  function patchTrait(id: string, patch: Partial<Trait>) {
    saveTraits((traits) =>
      traits.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }

  function deleteTrait(id: string) {
    saveTraits((traits) => traits.filter((t) => t.id !== id));
  }
</script>

<div
  class="flex flex-col gap-2 rounded border border-theme-border p-2"
  data-testid="species-definition-editor"
>
  <span class="text-micro font-bold uppercase tracking-widest text-theme-text">
    Species/Ancestry
  </span>
  <label class="flex items-center gap-2 text-xs text-theme-text">
    <input
      type="checkbox"
      checked={!!pkg}
      disabled={readOnly}
      onchange={(e) =>
        save(
          (e.target as HTMLInputElement).checked
            ? { kind: "species", traits: [] }
            : undefined,
        )}
      data-testid="species-definition-toggle"
    />
    Use as a Species/Ancestry definition
  </label>

  {#if pkg}
    {#each pkg.traits as trait (trait.id)}
      <SpeciesTraitEditor
        {trait}
        {readOnly}
        onPatch={(patch) => patchTrait(trait.id, patch)}
        onDelete={() => deleteTrait(trait.id)}
      />
    {/each}
    {#if !readOnly}
      <button
        type="button"
        class="self-start rounded border border-theme-border px-2 py-0.5 text-micro font-bold uppercase text-theme-text hover:border-theme-primary hover:text-theme-primary"
        onclick={addTrait}
        data-testid="species-add-trait"
      >
        Add trait
      </button>
    {/if}
  {/if}
</div>
