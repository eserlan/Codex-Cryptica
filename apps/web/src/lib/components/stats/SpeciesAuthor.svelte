<script lang="ts">
  import { tick } from "svelte";
  import {
    SpeciesDefinitionSchema,
    type Entity,
    type SpeciesDefinition,
  } from "schema";
  import { speciesPersistence } from "#lib/services/species-persistence.js";

  let {
    entity,
    readOnly = false,
    onSavingChange = () => {},
    save = (patch) => speciesPersistence.save(entity.id, patch),
  }: {
    entity: Entity;
    readOnly?: boolean;
    onSavingChange?: (saving: boolean) => void;
    save?: (patch: Partial<Entity>) => Promise<unknown>;
  } = $props();
  let draft = $state<SpeciesDefinition | null>(null);
  let error = $state("");
  let saving = $state(false);
  let trigger = $state<HTMLButtonElement>();

  function edit() {
    draft = structuredClone(
      $state.snapshot(entity.speciesDefinition) ?? {
        kind: "species",
        version: 1,
        traits: [],
      },
    );
    error = "";
  }
  async function close() {
    draft = null;
    error = "";
    await tick();
    trigger?.focus();
  }
  async function persist(remove = false) {
    if (readOnly || saving) return;
    const parsed = SpeciesDefinitionSchema.safeParse($state.snapshot(draft));
    if (!remove && !parsed.success) {
      error = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return;
    }
    saving = true;
    onSavingChange(true);
    try {
      const saved = await save({
        speciesDefinition: remove
          ? undefined
          : parsed.success
            ? parsed.data
            : undefined,
      });
      if (saved === false) throw new Error("The entity could not be saved.");
      saving = false;
      onSavingChange(false);
      await close();
    } catch {
      error =
        "Could not save Species/Ancestry. Your saved definition is unchanged. Try again.";
    } finally {
      saving = false;
      onSavingChange(false);
    }
  }
</script>

{#snippet definitionForm(definition: SpeciesDefinition)}
  <form
    class="space-y-3"
    onsubmit={(event) => {
      event.preventDefault();
      void persist();
    }}
  >
    <p class="text-sm text-theme-text">
      Use exact Stat Sheet keys from Edit Layout. Only numeric fields receive
      adjustments. Saving this definition does not change existing selections.
    </p>
    <fieldset class="space-y-3" disabled={saving}>
      {#each definition.traits as trait, i (trait.id)}
        <div class="space-y-2 rounded border border-theme-border p-2">
          <label class="block text-sm text-theme-text"
            >Trait name {i + 1}<input
              class="block w-full rounded border border-theme-border bg-theme-bg p-1"
              bind:value={trait.name}
            /></label
          >
          <label class="block text-sm text-theme-text"
            >Description {i + 1}<textarea
              class="block w-full rounded border border-theme-border bg-theme-bg p-1"
              bind:value={trait.description}
            ></textarea></label
          >
          {#each trait.adjustments as adjustment, j}
            <div class="flex flex-wrap gap-2">
              <label class="text-sm text-theme-text"
                >Target key {i + 1}.{j + 1}<input
                  class="block w-36 rounded border border-theme-border bg-theme-bg p-1"
                  bind:value={adjustment.key}
                /></label
              >
              <label class="text-sm text-theme-text"
                >Amount {i + 1}.{j + 1}<input
                  type="number"
                  step="any"
                  class="block w-24 rounded border border-theme-border bg-theme-bg p-1"
                  bind:value={adjustment.amount}
                /></label
              >
              <button
                type="button"
                class="text-sm text-theme-text"
                onclick={() => trait.adjustments.splice(j, 1)}
                >Remove adjustment {i + 1}.{j + 1}</button
              >
            </div>
          {/each}
          <button
            type="button"
            class="mr-3 text-sm text-theme-text"
            onclick={() => trait.adjustments.push({ key: "", amount: 0 })}
            >Add adjustment {i + 1}</button
          >
          <button
            type="button"
            class="text-sm text-theme-danger"
            onclick={() => definition.traits.splice(i, 1)}
            >Remove trait {i + 1}</button
          >
        </div>
      {/each}
      <button
        type="button"
        class="text-theme-text"
        onclick={() =>
          definition.traits.push({
            id: crypto.randomUUID(),
            name: "",
            description: "",
            adjustments: [],
          })}>Add trait</button
      >
      <div class="flex flex-wrap gap-3">
        <button
          type="submit"
          class="rounded bg-theme-primary px-3 py-1 text-theme-on-primary"
          >Save species definition</button
        >
        <button type="button" class="text-theme-text" onclick={close}
          >Cancel</button
        >
        {#if entity.speciesDefinition}<button
            type="button"
            class="text-theme-danger"
            onclick={() => persist(true)}>Remove designation</button
          >{/if}
      </div>
    </fieldset>
  </form>
{/snippet}

<section
  class="space-y-3 rounded border border-theme-border bg-theme-surface p-3"
  aria-label="Species/Ancestry definition"
>
  <h3 class="font-bold text-theme-text">Species/Ancestry</h3>
  {#if entity.speciesDefinition}<p class="text-sm text-theme-text">
      Designated Creature · {entity.speciesDefinition.traits.length} traits
    </p>{/if}
  {#if !readOnly}
    <button
      type="button"
      bind:this={trigger}
      class="rounded border border-theme-border px-3 py-1 text-theme-text"
      onclick={edit}
      disabled={saving}
    >
      {entity.speciesDefinition
        ? "Edit species traits"
        : "Designate Species/Ancestry"}
    </button>
    {#if draft}
      {@render definitionForm(draft)}
    {/if}
  {/if}
  {#if error}<p role="alert" class="text-sm text-theme-danger">{error}</p>{/if}
</section>
