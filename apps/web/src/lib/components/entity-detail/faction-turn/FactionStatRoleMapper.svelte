<script lang="ts">
  import type { Entity, FactionStatRole } from "schema";
  import { factionTurn } from "$lib/stores/faction-turn.svelte";
  import { isBuiltInFactionTurnSheet } from "$lib/stores/faction-turn-stat-roles";

  let { entity, roles }: { entity: Entity; roles: readonly FactionStatRole[] } =
    $props();

  /**
   * Only numeric stats can fulfil a role. A text field cannot be rolled
   * against, and silently coercing one would resolve turns against a stat the
   * GM never scored.
   */
  const numericFields = $derived(
    (entity.statSheet?.fields ?? []).filter((f) => f.type === "number"),
  );
  const builtInSheet = $derived(isBuiltInFactionTurnSheet(entity));

  const ROLE_LABELS: Record<FactionStatRole, string> = {
    power: "Power",
    influence: "Influence",
    resources: "Resources",
    stability: "Stability",
  };

  const ROLE_HINTS: Record<FactionStatRole, string> = {
    power: "Force and direct action",
    influence: "Politics, faith, persuasion",
    resources: "Wealth, territory, supply",
    stability: "Cohesion, and resistance to others",
  };

  async function assign(role: FactionStatRole, event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    await factionTurn.setRole(entity, role, value || undefined);
  }

  function builtInField(role: FactionStatRole) {
    return numericFields.find((field) => field.id === role);
  }
</script>

<div class="rounded-md border border-theme-border bg-theme-surface p-3">
  {#if builtInSheet}
    <h4 class="text-theme-text mb-1 font-medium">Faction stats</h4>
    <p class="text-theme-muted mb-3 text-xs">
      This sheet already defines each faction-turn stat.
    </p>
    <dl class="grid gap-2 sm:grid-cols-2">
      {#each roles as role (role)}
        {@const field = builtInField(role)}
        <div
          class="rounded border border-theme-border bg-theme-bg/40 px-2 py-1.5"
        >
          <dt class="text-theme-muted text-[11px]">{ROLE_LABELS[role]}</dt>
          <dd class="text-theme-text text-sm font-medium">
            {field ? `${field.label}: ${field.value}` : "Not set"}
          </dd>
        </div>
      {/each}
    </dl>
  {:else if numericFields.length === 0}
    <p class="text-theme-muted text-xs">
      This faction has no number stats yet. Add some on the Stats tab first.
    </p>
  {:else}
    <h4 class="text-theme-text mb-1 font-medium">Which stat means what</h4>
    <p class="text-theme-muted mb-3 text-xs">
      Name your stats whatever suits your world, then tell us which one plays
      each part. Only the ones an action needs have to be set.
    </p>
    <div class="grid gap-2 sm:grid-cols-2">
      {#each roles as role (role)}
        <label class="block">
          <span class="text-theme-text block text-xs font-medium"
            >{ROLE_LABELS[role]}</span
          >
          <span class="text-theme-muted mb-1 block text-xs"
            >{ROLE_HINTS[role]}</span
          >
          <select
            class="border-theme-border bg-theme-bg text-theme-text w-full rounded-md border px-2 py-1 text-sm"
            aria-label={`Stat for ${ROLE_LABELS[role]}`}
            value={entity.factionTurn?.statRoles?.[role] ?? ""}
            onchange={(e) => assign(role, e)}
          >
            <option value="">Not set</option>
            {#each numericFields as field (field.id)}
              <option value={field.id}>{field.label} ({field.value})</option>
            {/each}
          </select>
        </label>
      {/each}
    </div>
  {/if}
</div>
