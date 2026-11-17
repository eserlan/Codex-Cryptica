<script lang="ts">
  import { tick } from "svelte";
  import type { AppliedSpecies, Entity } from "schema";
  import { calculateSpecies, previewSpecies } from "@codex/stat-sheet-engine";
  import { speciesPersistence } from "#lib/services/species-persistence.js";
  import SpeciesTraits from "./SpeciesTraits.svelte";

  let {
    entity,
    candidates,
    readOnly = false,
    onSavingChange = () => {},
    save = (patch) => speciesPersistence.save(entity.id, patch),
    onOpenSource,
  }: {
    entity: Entity;
    candidates: Entity[];
    readOnly?: boolean;
    onSavingChange?: (saving: boolean) => void;
    save?: (patch: Partial<Entity>) => Promise<unknown>;
    onOpenSource: (id: string) => void;
  } = $props();
  const choices = $derived(
    candidates.filter(
      (item) => item.type === "creature" && item.speciesDefinition,
    ),
  );
  const source = $derived(
    choices.find(
      (item) => item.id === entity.appliedSpecies?.source.localEntityId,
    ),
  );
  let editing = $state(false);
  let selected = $state("");
  let review = $state<{ snapshot?: AppliedSpecies; token: string } | null>(
    null,
  );
  let error = $state("");
  let saving = $state(false);
  let trigger = $state<HTMLButtonElement>();
  let picker = $state<HTMLSelectElement>();

  function currentReview() {
    const candidate = choices.find((item) => item.id === selected);
    if (selected && !candidate)
      throw new Error(
        "This species is no longer available. Choose another species.",
      );
    const snapshot = candidate
      ? previewSpecies($state.snapshot(entity), $state.snapshot(candidate))
      : undefined;
    return {
      snapshot,
      token: JSON.stringify({
        entityId: entity.id,
        previous: entity.appliedSpecies,
        snapshot,
        results: calculateSpecies(snapshot, entity.statSheet?.fields ?? []),
      }),
    };
  }
  function select() {
    error = "";
    try {
      review = currentReview();
    } catch (cause) {
      error = (cause as Error).message;
      review = null;
    }
  }
  async function open() {
    selected = entity.appliedSpecies?.source.localEntityId ?? "";
    // A missing source can still be removed by choosing the explicit empty state.
    if (!choices.some((item) => item.id === selected)) selected = "";
    editing = true;
    select();
    await tick();
    picker?.focus();
  }
  async function close() {
    editing = false;
    review = null;
    error = "";
    await tick();
    trigger?.focus();
  }
  async function confirm() {
    if (readOnly || saving || !review) return;
    try {
      const current = currentReview();
      if (current.token !== review.token) {
        review = current;
        error =
          "The sheet or selection changed. Review the updated preview before confirming again.";
        return;
      }
      if (
        JSON.stringify(current.snapshot) ===
        JSON.stringify(entity.appliedSpecies)
      ) {
        await close();
        return;
      }
      saving = true;
      onSavingChange(true);
      const saved = await save({ appliedSpecies: current.snapshot });
      if (saved === false) throw new Error("The entity could not be saved.");
      saving = false;
      onSavingChange(false);
      await close();
    } catch (cause) {
      error = `Could not save Species/Ancestry. ${(cause as Error).message} Try again.`;
    } finally {
      saving = false;
      onSavingChange(false);
    }
  }
</script>

{#snippet selectionReview()}
  <div
    tabindex="-1"
    class="space-y-3"
    onkeydown={(event) => {
      if (event.key === "Escape" && !saving) {
        event.stopPropagation();
        void close();
      }
    }}
    role="dialog"
    aria-label="Review Species/Ancestry"
  >
    <label class="block text-sm text-theme-text"
      >Species/Ancestry
      <select
        bind:this={picker}
        class="block w-full rounded border border-theme-border bg-theme-bg p-2"
        bind:value={selected}
        onchange={select}
        disabled={saving}
      >
        <option value="">None — remove selection</option>
        {#each choices as choice (choice.id)}<option value={choice.id}
            >{choice.title}</option
          >{/each}
      </select>
    </label>
    {#if !choices.length}<p class="text-sm text-theme-text">
        No designated Creatures in this vault. Open a Creature's Stats tab and
        choose Designate Species/Ancestry.
      </p>{/if}
    {#if review?.snapshot}<SpeciesTraits
        snapshot={review.snapshot}
        fields={entity.statSheet?.fields ?? []}
      />
    {:else if review}<p class="text-sm text-theme-text">
        Remove only the saved species selection. Base values and notes stay as
        authored.
      </p>{/if}
    <p class="text-sm text-theme-text">
      Only compatible numeric targets contribute. Unavailable adjustments remain
      saved as provenance.
    </p>
    <button
      type="button"
      class="rounded bg-theme-primary px-3 py-1 text-theme-on-primary"
      onclick={confirm}
      disabled={saving || !review}>Confirm species selection</button
    >
    <button
      type="button"
      class="ml-3 text-theme-text"
      onclick={close}
      disabled={saving}>Cancel</button
    >
  </div>
{/snippet}

<section
  class="space-y-3 rounded border border-theme-border bg-theme-surface p-3"
  aria-label="Species/Ancestry selection"
>
  <h3 class="font-bold text-theme-text">Species/Ancestry</h3>
  {#if entity.appliedSpecies}
    <SpeciesTraits
      snapshot={entity.appliedSpecies}
      fields={entity.statSheet?.fields ?? []}
    />
    {#if source}
      <button
        type="button"
        class="text-sm text-theme-text"
        onclick={() => onOpenSource(source.id)}>Open source Creature</button
      >
    {:else}<p class="text-sm text-theme-text">
        Source Creature unavailable. Saved traits and contributions are
        retained.
      </p>{/if}
  {:else}<p class="text-sm text-theme-text">
      No Species/Ancestry selected.
    </p>{/if}
  {#if !readOnly}
    <button
      type="button"
      bind:this={trigger}
      class="rounded border border-theme-border px-3 py-1 text-theme-text"
      onclick={open}
      disabled={saving}>Choose Species/Ancestry</button
    >
    {#if editing}
      {@render selectionReview()}
    {/if}
  {/if}
  {#if error}<p role="alert" class="text-sm text-theme-danger">{error}</p>{/if}
</section>
