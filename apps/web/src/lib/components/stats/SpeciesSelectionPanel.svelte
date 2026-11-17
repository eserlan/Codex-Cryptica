<script lang="ts">
  import type { Entity, TraitSelection } from "schema";
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

  function reasonFor(row: (typeof preview)[number]): string {
    return row.status === "missing"
      ? "no field with this key"
      : "field is not a number field";
  }

  const formatAmount = (n: number) => (n > 0 ? `+${n}` : `${n}`);
</script>

<div
  class="flex flex-col gap-2 rounded border border-theme-border p-2"
  data-testid="species-selection-panel"
>
  <span class="text-micro font-bold uppercase tracking-widest text-theme-muted">
    Species/Ancestry
  </span>

  {#if current && !picking}
    <div class="flex items-center justify-between gap-2">
      {#if sourceAvailable}
        <button
          type="button"
          class="text-sm font-bold text-theme-primary hover:underline"
          onclick={() => (vault.selectedEntityId = current.sourceId)}
          data-testid="species-source-link"
        >
          {current.sourceTitle}
        </button>
      {:else}
        <span class="text-sm font-bold text-theme-text">
          {current.sourceTitle}
        </span>
        <span
          class="text-xs text-theme-muted"
          data-testid="species-unavailable"
        >
          Source creature unavailable
        </span>
      {/if}
      {#if !readOnly}
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded border border-theme-border px-2 py-1 text-micro font-bold uppercase text-theme-muted hover:border-theme-primary hover:text-theme-primary"
            onclick={startPicking}
            data-testid="species-change"
          >
            Change
          </button>
          <button
            type="button"
            class="rounded border border-theme-border px-2 py-1 text-micro font-bold uppercase text-theme-muted hover:border-red-500 hover:text-red-500"
            onclick={remove}
            data-testid="species-remove"
          >
            Remove
          </button>
        </div>
      {/if}
    </div>
    <ul class="flex flex-col gap-1" data-testid="species-traits">
      {#each current.traits as trait (trait.id)}
        <li class="text-xs text-theme-text">
          <span class="font-bold">{trait.name}</span>
          {#if trait.description}
            <span class="text-theme-muted"> {trait.description}</span>
          {/if}
        </li>
      {/each}
    </ul>
  {:else if !readOnly}
    {#if !picking}
      <button
        type="button"
        class="self-start rounded border border-theme-border px-2 py-1 text-micro font-bold uppercase text-theme-muted hover:border-theme-primary hover:text-theme-primary"
        onclick={startPicking}
        data-testid="species-choose"
      >
        Choose species
      </button>
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

      {#if chosen}
        <div class="flex flex-col gap-1" data-testid="species-preview">
          {#each chosen.traitPackage?.traits ?? [] as trait (trait.id)}
            <div class="text-xs text-theme-text">
              <span class="font-bold">{trait.name}</span>
              {#if trait.description}
                <span class="text-theme-muted"> {trait.description}</span>
              {/if}
            </div>
          {/each}
          {#each preview as row, i (i)}
            <div class="text-xs" data-testid="species-preview-row">
              {#if row.status === "applied"}
                <span class="text-theme-text">
                  {row.traitName}: {row.fieldLabel}
                  {formatAmount(row.amount)}
                  ({row.base} → {row.effective})
                </span>
              {:else}
                <span class="text-theme-muted">
                  {row.traitName}: {row.target}
                  {formatAmount(row.amount)} · Not applied ({reasonFor(row)})
                </span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <div class="flex gap-2">
        <button
          type="button"
          class="rounded border border-theme-primary px-2 py-1 text-micro font-bold uppercase text-theme-primary disabled:opacity-40"
          disabled={!chosen}
          onclick={apply}
          data-testid="species-apply"
        >
          Apply
        </button>
        <button
          type="button"
          class="rounded border border-theme-border px-2 py-1 text-micro font-bold uppercase text-theme-muted"
          onclick={cancel}
          data-testid="species-cancel"
        >
          Cancel
        </button>
      </div>
    {/if}
  {:else}
    <span class="text-xs text-theme-muted">No species selected.</span>
  {/if}
</div>
