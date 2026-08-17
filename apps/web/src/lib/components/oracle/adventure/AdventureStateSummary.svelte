<script lang="ts">
  import type { AdventureManager } from "$lib/stores/oracle/adventure-manager.svelte";
  let { manager }: { manager: AdventureManager } = $props();
</script>

{#if manager.session && manager.recap}
  {@const recap = manager.recap}
  <section
    class="rounded-lg border border-theme-border p-4"
    aria-labelledby="adventure-state-heading"
  >
    <h3 id="adventure-state-heading" class="font-semibold text-theme-primary">
      Current situation
    </h3>
    {#if recap.location}<p class="mt-2 text-sm text-theme-primary">
        <strong>Location:</strong>
        {recap.location.text}
      </p>{/if}
    {#if recap.situation}<p class="mt-1 text-sm text-theme-primary">
        {recap.situation.text}
      </p>{/if}
    {#if recap.objectives.length}<h4
        class="mt-3 text-sm font-medium text-theme-primary"
      >
        Objectives
      </h4>
      <ul class="list-disc pl-5 text-sm text-theme-secondary">
        {#each recap.objectives as objective (objective.id)}<li>
            {objective.text}
          </li>{/each}
      </ul>{/if}
    {#if recap.activeCharacters.length}<h4
        class="mt-3 text-sm font-medium text-theme-primary"
      >
        Who's here
      </h4>
      <ul class="list-disc pl-5 text-sm text-theme-secondary">
        {#each recap.activeCharacters as character (character.id)}<li>
            {character.text}
          </li>{/each}
      </ul>{/if}
    {#if recap.knownFacts.length}<h4
        class="mt-3 text-sm font-medium text-theme-primary"
      >
        What you know
      </h4>
      <ul class="list-disc pl-5 text-sm text-theme-secondary">
        {#each recap.knownFacts as fact (fact.id)}<li>{fact.text}</li>{/each}
      </ul>{/if}
    {#if recap.recentTurnSummaries.length}<details class="mt-3 text-sm">
        <summary class="cursor-pointer font-medium text-theme-primary"
          >Recap: what just happened</summary
        >
        <ol class="mt-2 list-decimal space-y-1 pl-5 text-theme-secondary">
          {#each recap.recentTurnSummaries as summary, index (index)}<li>
              {summary}
            </li>{/each}
        </ol>
      </details>{/if}
  </section>
{/if}
