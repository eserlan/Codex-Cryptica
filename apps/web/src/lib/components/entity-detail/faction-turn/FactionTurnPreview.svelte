<script lang="ts">
  import type { Entity } from "schema";
  import type { FactionTurnProposal } from "@codex/faction-engine";
  import { bandLabel } from "@codex/faction-engine";
  import { factionTurn } from "$lib/stores/faction-turn.svelte";

  let { entity, proposal }: { entity: Entity; proposal: FactionTurnProposal } =
    $props();

  /**
   * The GM's edit, tagged with the proposal it belongs to.
   *
   * Seeding `$state` from a prop would capture only the first proposal's text
   * and then go stale. Tagging by `stateHash` also gives the behaviour the spec
   * asks for free: re-resolving produces a different hash, so the edit belongs
   * to the discarded preview and is not carried onto the new result.
   */
  let edited = $state<{ forHash: string; text: string } | null>(null);
  const narrative = $derived(
    edited?.forHash === proposal.stateHash ? edited.text : proposal.narrative,
  );

  let optIntoTypeChange = $state(false);
  let showWorking = $state(false);

  const r = $derived(proposal.resolution);

  const statChanges = $derived(
    proposal.changes.filter((c) => c.kind === "stat-value"),
  );
  const strengthChange = $derived(
    proposal.changes.find((c) => c.kind === "connection-strength"),
  );

  function percent(value: number | null): string {
    if (value === null) return "none";
    return `${Math.round(value * 100)}%`;
  }

  async function commit() {
    if (factionTurn.isCommitting) return;
    // The GM's text is what gets stored and what any promoted event carries.
    const finalProposal = {
      ...proposal,
      narrative: narrative.trim() || proposal.narrative,
    };
    await factionTurn.commit(finalProposal, optIntoTypeChange);
  }
</script>

<div
  class="rounded-md border border-theme-border bg-theme-surface p-3"
  data-testid="faction-turn-preview"
>
  <div class="mb-2 flex items-center justify-between gap-2">
    <h4 class="text-theme-text font-medium">
      {bandLabel(r.finalBand)}
    </h4>
    <span class="text-theme-muted text-xs">Nothing saved yet</span>
  </div>

  <label class="mb-3 block">
    <span class="text-theme-muted mb-1 block text-xs">What happened</span>
    <textarea
      class="border-theme-border bg-theme-bg text-theme-text w-full rounded-md border px-2 py-1 text-sm"
      rows="3"
      aria-label="Account of what happened"
      value={narrative}
      oninput={(e) =>
        (edited = {
          forHash: proposal.stateHash,
          text: (e.currentTarget as HTMLTextAreaElement).value,
        })}
    ></textarea>
  </label>

  <ul class="text-theme-muted mb-3 space-y-1 text-xs">
    {#each statChanges as change (change.fieldId)}
      <li>
        {r.actingLabel}: {change.from} → {change.to}
        {#if change.clamped}<span class="italic"> (capped)</span>{/if}
      </li>
    {/each}
    {#if strengthChange}
      <li>
        Hold on {proposal.targetTitle}: {percent(strengthChange.from)} → {percent(
          strengthChange.to,
        )}
        {#if strengthChange.clamped}<span class="italic"> (capped)</span>{/if}
      </li>
    {/if}
  </ul>

  {#if proposal.suggestedTypeChange}
    <label class="mb-3 flex items-start gap-2 text-xs">
      <input type="checkbox" bind:checked={optIntoTypeChange} />
      <span class="text-theme-muted">
        Also change this relationship to <strong
          >{proposal.suggestedTypeChange}</strong
        >. Left unticked, only how firmly they hold it changes.
      </span>
    </label>
  {/if}

  <button
    type="button"
    class="text-theme-muted hover:text-theme-text mb-2 text-xs underline"
    onclick={() => (showWorking = !showWorking)}
    aria-expanded={showWorking}
  >
    {showWorking ? "Hide the working" : "Show the working"}
  </button>

  {#if showWorking}
    <dl class="text-theme-muted mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
      <dt>{r.actingLabel}</dt>
      <dd>{r.actingValue}</dd>
      <dt>Resistance</dt>
      <dd>{r.opposingValue}</dd>
      <dt>Why that much</dt>
      <dd>{r.oppositionDetail}</dd>
      {#if r.roll}
        <dt>Rolled</dt>
        <dd>{r.roll.formula} → {r.roll.dice.join(", ")} ({r.roll.total})</dd>
      {:else}
        <dt>Rolled</dt>
        <dd>No dice — compared directly</dd>
      {/if}
      <dt>Total</dt>
      <dd>{r.total}</dd>
      <dt>Rules said</dt>
      <dd>{bandLabel(r.mechanicalBand)}</dd>
      {#if r.aiUsed && r.aiReason}
        <dt>Adjusted to</dt>
        <dd>{bandLabel(r.finalBand)} — {r.aiReason}</dd>
      {/if}
      <dt>Could have been</dt>
      <dd>{r.permittedBands.map(bandLabel).join(", ")}</dd>
    </dl>
  {/if}

  <div class="flex gap-2">
    <button
      type="button"
      class="rounded-md border border-theme-border px-3 py-1.5 text-sm hover:bg-theme-hover disabled:opacity-50"
      disabled={factionTurn.isCommitting}
      data-testid="faction-commit"
      onclick={commit}
    >
      {factionTurn.isCommitting ? "Saving…" : "Apply this turn"}
    </button>
    <button
      type="button"
      class="text-theme-muted hover:text-theme-text px-3 py-1.5 text-sm underline"
      disabled={factionTurn.isCommitting}
      onclick={() => factionTurn.discard()}
    >
      Throw it away
    </button>
  </div>
  <p class="text-theme-muted mt-2 text-xs">
    Acting for {entity.title}.
  </p>
</div>
