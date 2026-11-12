<script lang="ts">
  import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
  let { manager }: { manager: AdventureManager } = $props();

  const STATUS_LABELS = {
    open: "Open",
    resolved: "Resolved",
    abandoned: "Left behind",
  } as const;

  // Only non-empty groups are listed.
  const groups = $derived.by(() => {
    const recap = manager.recap;
    if (!recap) return [];
    const leadItems =
      recap.knownLeads?.map((lead) => {
        const statusLabel = STATUS_LABELS[lead.status] ?? "Open";
        const focusSuffix = lead.focused ? ", following" : "";
        const updateSuffix = lead.lastUpdate ? ` — ${lead.lastUpdate}` : "";
        return `${lead.lead} (${statusLabel}${focusSuffix})${updateSuffix}`;
      }) ?? [];
    return [
      { label: "Objectives", items: recap.objectives.map((item) => item.text) },
      {
        label: "Who's here",
        items: recap.activeCharacters.map((item) => item.text),
      },
      {
        label: "What you know",
        items: recap.knownFacts.map((item) => item.text),
      },
      { label: "Known leads", items: leadItems },
      { label: "Recap: what just happened", items: recap.recentTurnSummaries },
    ].filter((group) => group.items.length > 0);
  });
</script>

{#if manager.session && manager.recap}
  {@const recap = manager.recap}
  <section
    aria-labelledby="adventure-state-heading"
    data-testid="adventure-scene-strip"
  >
    <h3 id="adventure-state-heading" class="sr-only">Current situation</h3>
    <!-- Compact by default: the transcript is the primary play surface. -->
    <details
      class="group rounded-lg border border-theme-border bg-theme-surface/60"
      data-testid="adventure-scene-details"
    >
      <summary
        class="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm text-theme-text [&::-webkit-details-marker]:hidden"
      >
        <span
          class="icon-[lucide--map-pin] h-4 w-4 shrink-0 text-theme-text"
          aria-hidden="true"
        ></span>
        <span class="min-w-0 flex-1 truncate font-medium">
          {recap.location?.text ?? "Current situation"}
        </span>
        {#if recap.elapsedTimeLabel}
          <span
            class="shrink-0 text-xs text-theme-text font-medium"
            title="Elapsed fictional time"
          >
            {recap.elapsedTimeLabel}
          </span>
        {/if}
        <span class="shrink-0 text-xs text-theme-text">Scene details</span>
        <span
          class="icon-[lucide--chevron-down] h-4 w-4 shrink-0 text-theme-text transition-transform group-open:rotate-180"
          aria-hidden="true"
        ></span>
      </summary>
      <div
        class="space-y-3 border-t border-theme-border px-3 py-3 text-sm text-theme-text"
      >
        {#if recap.location}
          <!-- The summary line truncates; the full place name is always here. -->
          <p data-testid="adventure-scene-location">
            <span class="font-semibold">Location:</span>
            <span class="break-words">{recap.location.text}</span>
          </p>
        {/if}
        {#if recap.situation}
          <p>{recap.situation.text}</p>
        {/if}
        {#each groups as group (group.label)}
          <div>
            <h4 class="font-semibold">{group.label}</h4>
            <ul class="mt-1 list-disc pl-5 text-theme-text">
              {#each group.items as item, index (index)}
                <li>{item}</li>
              {/each}
            </ul>
          </div>
        {/each}
      </div>
    </details>
  </section>
{/if}
