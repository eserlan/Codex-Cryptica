<script lang="ts">
  import type { Entity } from "schema";
  import { FACTION_STAT_ROLES } from "schema";
  import { factionTurn } from "$lib/stores/faction-turn.svelte";
  import { vault } from "$lib/stores/vault.svelte";
  import FactionStatRoleMapper from "./faction-turn/FactionStatRoleMapper.svelte";
  import FactionTurnAction from "./faction-turn/FactionTurnAction.svelte";
  import FactionTurnPreview from "./faction-turn/FactionTurnPreview.svelte";
  import FactionTurnHistory from "./faction-turn/FactionTurnHistory.svelte";
  import { FEATURE_HELP_ARTICLES } from "$lib/config/help-content";
  import { helpStore } from "$lib/stores/help.svelte";

  let { entity }: { entity: Entity } = $props();

  const enabled = $derived(factionTurn.isEnabled(entity));
  const eligibility = $derived(factionTurn.eligibility(entity));
  const history = $derived(factionTurn.history(entity));

  // Only the roles Influence actually uses are required (FR-005). Requiring all
  // four would block a GM who never modelled military power.
  const influenceMapped = $derived(
    Boolean(entity.factionTurn?.statRoles?.influence),
  );

  let busy = $state(false);

  async function toggle() {
    if (busy) return;
    busy = true;
    try {
      await factionTurn.setEnabled(entity, !enabled);
    } finally {
      busy = false;
    }
  }
</script>

<div class="space-y-4 text-sm">
  {#if !enabled}
    <div class="rounded-md border border-theme-border bg-theme-surface p-4">
      <h3 class="text-theme-text mb-1 font-medium">Faction turns</h3>
      <p class="text-theme-muted mb-3">
        Let this faction act on the world between sessions. It will use stats
        you name yourself, and nothing changes until you approve it.
      </p>
      <button
        type="button"
        class="rounded-md border border-theme-border px-3 py-1.5 hover:bg-theme-hover"
        disabled={busy}
        onclick={toggle}
      >
        Turn on faction turns
      </button>
    </div>
  {:else}
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-theme-text font-medium">Faction turns</h3>
        <p class="text-theme-muted">{eligibility.reason}</p>
      </div>
      <div class="flex shrink-0 items-center gap-3 text-xs">
        <button
          type="button"
          class="text-theme-muted hover:text-theme-text underline"
          onclick={() =>
            helpStore.openHelpToArticle(FEATURE_HELP_ARTICLES.FACTION_TURNS)}
        >
          How this works
        </button>
        <button
          type="button"
          class="text-theme-muted hover:text-theme-text underline"
          disabled={busy}
          onclick={toggle}
        >
          Turn off
        </button>
      </div>
    </div>

    <FactionStatRoleMapper {entity} roles={FACTION_STAT_ROLES} />

    {#if eligibility.state === "no-world-date"}
      <div
        class="rounded-md border border-theme-border bg-theme-surface p-3"
        data-testid="faction-no-world-date"
      >
        <p class="text-theme-muted">
          Faction turns are paced by your campaign's current date, and this
          vault does not have one yet. Set a current year in vault settings, or
          create an event called “Current date”.
        </p>
      </div>
    {:else if !influenceMapped}
      <div class="rounded-md border border-theme-border bg-theme-surface p-3">
        <p class="text-theme-muted">
          Choose which stat stands for <strong>influence</strong> above, and this
          faction can take a turn.
        </p>
      </div>
    {:else if factionTurn.proposal}
      <FactionTurnPreview {entity} proposal={factionTurn.proposal} />
    {:else}
      <FactionTurnAction {entity} {eligibility} />
    {/if}

    {#if factionTurn.lastError}
      <p class="text-theme-danger" role="status">{factionTurn.lastError}</p>
    {/if}

    <FactionTurnHistory {entity} {history} vaultEntities={vault.entities} />
  {/if}
</div>
