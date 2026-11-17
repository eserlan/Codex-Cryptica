<script lang="ts">
  import type { Entity, Trait, TraitPackageDefinition } from "schema";
  import { vault } from "#lib/stores/vault.svelte.js";
  import {
    type IdGenerator,
    systemIdGenerator,
  } from "#lib/utils/runtime-deps.js";

  let {
    entity,
    idGenerator = systemIdGenerator,
  }: { entity: Entity; idGenerator?: IdGenerator } = $props();

  const readOnly = $derived(vault.isGuest);
  const pkg = $derived(entity.traitPackage);

  let pendingTarget = $state<Record<string, string>>({});
  let pendingAmount = $state<Record<string, string>>({});

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

  function toggle(on: boolean) {
    save(on ? { kind: "species", traits: [] } : undefined);
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

  function addAdjustment(trait: Trait) {
    const target = (pendingTarget[trait.id] ?? "").trim();
    const amount = Number(pendingAmount[trait.id]);
    if (!target || !Number.isFinite(amount) || amount === 0) return;
    patchTrait(trait.id, {
      adjustments: [...trait.adjustments, { target, amount }],
    });
    pendingTarget[trait.id] = "";
    pendingAmount[trait.id] = "";
  }

  function patchAdjustment(
    trait: Trait,
    index: number,
    patch: { target?: string; amount?: number },
  ) {
    const merged = { ...trait.adjustments[index], ...patch };
    if (!merged.target.trim() || !Number.isFinite(merged.amount)) return;
    if (merged.amount === 0) return;
    patchTrait(trait.id, {
      adjustments: trait.adjustments.map((a, i) => (i === index ? merged : a)),
    });
  }

  function deleteAdjustment(trait: Trait, index: number) {
    patchTrait(trait.id, {
      adjustments: trait.adjustments.filter((_, i) => i !== index),
    });
  }

  const inputClass =
    "rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text disabled:opacity-40";
  const smallButton =
    "rounded border border-theme-border px-2 py-0.5 text-micro font-bold uppercase text-theme-muted hover:border-theme-primary hover:text-theme-primary";
</script>

<div
  class="flex flex-col gap-2 rounded border border-theme-border p-2"
  data-testid="species-definition-editor"
>
  <span class="text-micro font-bold uppercase tracking-widest text-theme-muted">
    Species/Ancestry
  </span>
  <label class="flex items-center gap-2 text-xs text-theme-text">
    <input
      type="checkbox"
      checked={!!pkg}
      disabled={readOnly}
      onchange={(e) => toggle((e.target as HTMLInputElement).checked)}
      data-testid="species-definition-toggle"
    />
    Use as a Species/Ancestry definition
  </label>

  {#if pkg}
    {#each pkg.traits as trait (trait.id)}
      <div
        class="flex flex-col gap-1 rounded border border-theme-border/60 p-2"
        data-testid="species-trait"
      >
        <div class="flex items-center gap-2">
          <input
            class="{inputClass} flex-1"
            aria-label="Trait name"
            value={trait.name}
            disabled={readOnly}
            onchange={(e) =>
              (e.target as HTMLInputElement).value.trim() &&
              patchTrait(trait.id, {
                name: (e.target as HTMLInputElement).value.trim(),
              })}
          />
          {#if !readOnly}
            <button
              type="button"
              class={smallButton}
              onclick={() => deleteTrait(trait.id)}
              aria-label="Delete trait {trait.name}"
            >
              Delete
            </button>
          {/if}
        </div>
        <textarea
          class="{inputClass} w-full"
          rows="2"
          aria-label="Trait description"
          value={trait.description}
          disabled={readOnly}
          onchange={(e) =>
            patchTrait(trait.id, {
              description: (e.target as HTMLTextAreaElement).value,
            })}
        ></textarea>
        {#each trait.adjustments as adj, i (i)}
          <div class="flex items-center gap-2" data-testid="species-adjustment">
            <input
              class="{inputClass} w-32"
              aria-label="Adjustment target"
              value={adj.target}
              disabled={readOnly}
              onchange={(e) =>
                patchAdjustment(trait, i, {
                  target: (e.target as HTMLInputElement).value.trim(),
                })}
            />
            <input
              type="number"
              class="{inputClass} w-16"
              aria-label="Adjustment amount"
              value={adj.amount}
              disabled={readOnly}
              onchange={(e) =>
                patchAdjustment(trait, i, {
                  amount: Number((e.target as HTMLInputElement).value),
                })}
            />
            {#if !readOnly}
              <button
                type="button"
                class={smallButton}
                onclick={() => deleteAdjustment(trait, i)}
                aria-label="Delete adjustment {adj.target}"
              >
                Delete
              </button>
            {/if}
          </div>
        {/each}
        {#if !readOnly}
          <div class="flex items-center gap-2">
            <input
              class="{inputClass} w-32"
              placeholder="Field id or key"
              aria-label="New adjustment target"
              bind:value={pendingTarget[trait.id]}
            />
            <input
              type="number"
              class="{inputClass} w-16"
              placeholder="+1"
              aria-label="New adjustment amount"
              bind:value={pendingAmount[trait.id]}
            />
            <button
              type="button"
              class={smallButton}
              onclick={() => addAdjustment(trait)}
              data-testid="species-add-adjustment"
            >
              Add adjustment
            </button>
          </div>
        {/if}
      </div>
    {/each}
    {#if !readOnly}
      <button
        type="button"
        class="{smallButton} self-start"
        onclick={addTrait}
        data-testid="species-add-trait"
      >
        Add trait
      </button>
    {/if}
  {/if}
</div>
