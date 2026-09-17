<script lang="ts">
  import type { Entity } from "schema";
  import type { EligibilityResult } from "@codex/faction-engine";
  import { factionTurn } from "$lib/stores/faction-turn.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import { canTargetWithFactionTurn } from "./targeting";

  let {
    entity,
    eligibility,
  }: { entity: Entity; eligibility: EligibilityResult } = $props();

  let query = $state("");
  let targetId = $state("");

  /** World entities a faction can meaningfully influence (FR-016). */
  const candidates = $derived.by(() => {
    const term = query.trim().toLowerCase();
    return vault.allEntities
      .filter((candidate) => canTargetWithFactionTurn(entity.id, candidate))
      .filter((e) => !term || e.title.toLowerCase().includes(term))
      .slice(0, 50);
  });

  const target = $derived(targetId ? vault.entities[targetId] : undefined);

  async function takeTurn(isOverride: boolean) {
    if (!target || factionTurn.isResolving) return;
    await factionTurn.propose(entity, target, { isOverride });
  }
</script>

<div class="rounded-md border border-theme-border bg-theme-surface p-3">
  <h4 class="text-theme-text mb-2 font-medium">Take a turn</h4>

  <label class="mb-2 block">
    <span class="text-theme-muted mb-1 block text-xs">Who or what?</span>
    <input
      type="search"
      class="border-theme-border bg-theme-bg text-theme-text mb-1 w-full rounded-md border px-2 py-1 text-sm"
      placeholder="Search your vault"
      aria-label="Search for a target"
      bind:value={query}
    />
    <select
      class="border-theme-border bg-theme-bg text-theme-text w-full rounded-md border px-2 py-1 text-sm"
      aria-label="Target"
      bind:value={targetId}
    >
      <option value="">Choose a target</option>
      {#each candidates as candidate (candidate.id)}
        <option value={candidate.id}>{candidate.title}</option>
      {/each}
    </select>
  </label>

  {#if eligibility.canAct}
    <button
      type="button"
      class="rounded-md border border-theme-border px-3 py-1.5 text-sm hover:bg-theme-hover disabled:opacity-50"
      disabled={!target || factionTurn.isResolving}
      data-testid="faction-take-turn"
      onclick={() => takeTurn(false)}
    >
      {factionTurn.isResolving ? "Resolving…" : "Extend influence"}
    </button>
  {:else}
    <p class="text-theme-muted mb-2 text-xs">{eligibility.reason}</p>
    {#if eligibility.canOverride}
      <button
        type="button"
        class="rounded-md border border-theme-border px-3 py-1.5 text-sm hover:bg-theme-hover disabled:opacity-50"
        disabled={!target || factionTurn.isResolving}
        data-testid="faction-override-turn"
        onclick={() => takeTurn(true)}
      >
        Act anyway
      </button>
      <p class="text-theme-muted mt-1 text-xs">
        This turn will be recorded as taken ahead of schedule.
      </p>
    {/if}
  {/if}
</div>
