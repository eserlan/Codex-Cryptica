<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  let { manager }: { manager: AdventureManager } = $props();
</script>

{#if manager.session && manager.recap}
  {@const recap = manager.recap}
  <section
    aria-labelledby="adventure-state-heading"
    data-testid="adventure-scene-strip"
  >
    <h3 id="adventure-state-heading" class="sr-only">
      Current situation
    </h3>
    <!-- Scene information is one compact row by default. The narrative below
         is the primary play surface; the recap remains available on demand. -->
    <details
      class="group rounded-lg border border-theme-border bg-theme-surface/60"
      data-testid="adventure-scene-details"
    >
      <summary
        class="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-theme-primary [&::-webkit-details-marker]:hidden"
      >
        <span
          class="icon-[lucide--map-pin] h-4 w-4 shrink-0 text-theme-secondary"
          aria-hidden="true"
        ></span>
        <span class="min-w-0 flex-1 truncate font-medium">
          {recap.location?.text ?? "Current situation"}
        </span>
        <span class="shrink-0 text-xs text-theme-secondary">Scene details</span>
        <span
          class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 text-theme-secondary transition-transform group-open:rotate-180"
          aria-hidden="true"
        ></span>
      </summary>
      <div class="space-y-3 border-t border-theme-border px-3 py-3 text-sm text-theme-primary">
        {#if recap.situation}
          <p>{recap.situation.text}</p>
        {/if}
        {#if recap.objectives.length}
          <div>
            <h4 class="font-semibold">Objectives</h4>
            <ul class="mt-1 list-disc pl-5 text-theme-secondary">
              {#each recap.objectives as objective (objective.id)}
                <li>{objective.text}</li>
              {/each}
            </ul>
          </div>
        {/if}
        {#if recap.activeCharacters.length}
          <div>
            <h4 class="font-semibold">Who's here</h4>
            <ul class="mt-1 list-disc pl-5 text-theme-secondary">
              {#each recap.activeCharacters as character (character.id)}
                <li>{character.text}</li>
              {/each}
            </ul>
          </div>
        {/if}
        {#if recap.knownFacts.length}
          <div>
            <h4 class="font-semibold">What you know</h4>
            <ul class="mt-1 list-disc pl-5 text-theme-secondary">
              {#each recap.knownFacts as fact (fact.id)}
                <li>{fact.text}</li>
              {/each}
            </ul>
          </div>
        {/if}
        {#if recap.recentTurnSummaries.length}
          <div>
            <h4 class="font-semibold">Recap: what just happened</h4>
            <ol class="mt-1 list-decimal space-y-1 pl-5 text-theme-secondary">
              {#each recap.recentTurnSummaries as summary, index (index)}
                <li>{summary}</li>
              {/each}
            </ol>
          </div>
        {/if}
      </div>
    </details>
  </section>
{/if}
