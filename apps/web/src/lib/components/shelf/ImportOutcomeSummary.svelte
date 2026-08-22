<script lang="ts">
  import type { ImportOutcome } from "@codex/entity-shelf";

  let { outcome }: { outcome: ImportOutcome } = $props();

  const droppedTotal = $derived(
    outcome.droppedConnections.length + outcome.droppedParents.length,
  );

  /**
   * Distinguishing the two reasons matters: "no match found" means the target
   * simply is not here, while "more than one match" means the Shelf declined to
   * guess. Collapsing them would hide a decision the author may want to make
   * by hand.
   */
  function reasonLabel(reason?: string): string {
    return reason === "ambiguous"
      ? "more than one entity here has that name"
      : "no matching entity here";
  }
</script>

<div class="space-y-4 text-sm" data-testid="import-outcome">
  <div>
    <p class="text-theme-text">
      Imported {outcome.created.length}
      {outcome.created.length === 1 ? "entity" : "entities"}.
    </p>
    <ul class="mt-1 text-xs text-theme-text-muted list-disc list-inside">
      {#each outcome.created as entity (entity.entityId)}
        <li>{entity.title}</li>
      {/each}
    </ul>
  </div>

  {#if outcome.renamed.length > 0}
    <div>
      <p class="text-theme-text-muted text-xs uppercase tracking-widest">
        Renamed to avoid a clash
      </p>
      <ul class="mt-1 text-xs text-theme-text list-disc list-inside">
        {#each outcome.renamed as rename (rename.to)}
          <li>“{rename.from}” arrived as “{rename.to}”</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if outcome.templatesReused.length > 0 || outcome.templatesBroughtIn.length > 0}
    <div>
      <p class="text-theme-text-muted text-xs uppercase tracking-widest">
        Stat sheet templates
      </p>
      <ul class="mt-1 text-xs text-theme-text list-disc list-inside">
        {#each outcome.templatesReused as id (id)}
          <li>Reused the one already in this vault ({id})</li>
        {/each}
        {#each outcome.templatesBroughtIn as id (id)}
          <li>Brought across ({id})</li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if droppedTotal > 0}
    <div>
      <p class="text-theme-text-muted text-xs uppercase tracking-widest">
        Links that could not be reconnected
      </p>
      <p class="mt-1 text-xs text-theme-text-muted">
        The import went ahead without these. Reconnect them by hand if you want
        them.
      </p>
      <ul class="mt-1 text-xs text-theme-text list-disc list-inside">
        {#each outcome.droppedConnections as dropped (dropped.entryId + dropped.targetRef)}
          <li>
            {dropped.type} → {dropped.targetRef} ({reasonLabel(dropped.reason)})
          </li>
        {/each}
        {#each outcome.droppedParents as dropped (dropped.entryId + dropped.parentRef)}
          <li>parent → {dropped.parentRef} ({reasonLabel(dropped.reason)})</li>
        {/each}
      </ul>
    </div>
  {/if}
</div>
