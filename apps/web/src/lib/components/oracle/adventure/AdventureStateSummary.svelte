<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  let { manager }: { manager: AdventureManager } = $props();
</script>

{#if manager.session}
  <section
    class="rounded-lg border border-theme-border p-4"
    aria-labelledby="adventure-state-heading"
  >
    <h3 id="adventure-state-heading" class="font-semibold text-theme-primary">
      Current situation
    </h3>
    {#if manager.session.visibleState.location}<p
        class="mt-2 text-sm text-theme-primary"
      >
        <strong>Location:</strong>
        {manager.session.visibleState.location.text}
      </p>{/if}
    {#if manager.session.visibleState.situation}<p
        class="mt-1 text-sm text-theme-primary"
      >
        {manager.session.visibleState.situation.text}
      </p>{/if}
    {#if manager.session.visibleState.objectives.length}<h4
        class="mt-3 text-sm font-medium text-theme-primary"
      >
        Objectives
      </h4>
      <ul class="list-disc pl-5 text-sm text-theme-secondary">
        {#each manager.session.visibleState.objectives as objective (objective.id)}<li
          >
            {objective.text}
          </li>{/each}
      </ul>{/if}
  </section>
{/if}
