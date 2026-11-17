<script lang="ts">
  import type { Trait } from "schema";

  let {
    trait,
    readOnly,
    onPatch,
    onDelete,
  }: {
    trait: Trait;
    readOnly: boolean;
    onPatch: (patch: Partial<Trait>) => void;
    onDelete: () => void;
  } = $props();

  let pendingTarget = $state("");
  let pendingAmount = $state("");

  const inputClass =
    "rounded border border-theme-border bg-theme-bg px-1.5 py-0.5 text-xs text-theme-text disabled:opacity-40";
  const smallButton =
    "rounded border border-theme-border px-2 py-0.5 text-micro font-bold uppercase text-theme-text hover:border-theme-primary hover:text-theme-primary";

  function addAdjustment() {
    const target = pendingTarget.trim();
    const amount = Number(pendingAmount);
    if (!target || !Number.isFinite(amount) || amount === 0) return;
    onPatch({ adjustments: [...trait.adjustments, { target, amount }] });
    pendingTarget = "";
    pendingAmount = "";
  }

  function patchAdjustment(
    index: number,
    patch: { target?: string; amount?: number },
  ) {
    const merged = { ...trait.adjustments[index], ...patch };
    if (!merged.target || !Number.isFinite(merged.amount)) return;
    if (merged.amount === 0) return;
    onPatch({
      adjustments: trait.adjustments.map((a, i) => (i === index ? merged : a)),
    });
  }

  function deleteAdjustment(index: number) {
    onPatch({ adjustments: trait.adjustments.filter((_, i) => i !== index) });
  }

  function rename(value: string) {
    if (value.trim()) onPatch({ name: value.trim() });
  }
</script>

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
      onchange={(e) => rename((e.target as HTMLInputElement).value)}
    />
    {#if !readOnly}
      <button
        type="button"
        class={smallButton}
        onclick={onDelete}
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
      onPatch({ description: (e.target as HTMLTextAreaElement).value })}
  ></textarea>
  {#each trait.adjustments as adj, i (i)}
    <div class="flex items-center gap-2" data-testid="species-adjustment">
      <input
        class="{inputClass} w-32"
        aria-label="Adjustment target"
        value={adj.target}
        disabled={readOnly}
        onchange={(e) =>
          patchAdjustment(i, {
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
          patchAdjustment(i, {
            amount: Number((e.target as HTMLInputElement).value),
          })}
      />
      {#if !readOnly}
        <button
          type="button"
          class={smallButton}
          onclick={() => deleteAdjustment(i)}
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
        bind:value={pendingTarget}
      />
      <input
        type="number"
        class="{inputClass} w-16"
        placeholder="+1"
        aria-label="New adjustment amount"
        bind:value={pendingAmount}
      />
      <button
        type="button"
        class={smallButton}
        onclick={addAdjustment}
        data-testid="species-add-adjustment"
      >
        Add adjustment
      </button>
    </div>
  {/if}
</div>
