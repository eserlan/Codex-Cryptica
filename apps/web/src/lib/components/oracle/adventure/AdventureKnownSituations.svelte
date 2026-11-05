<script lang="ts">
  import type { ScenarioItem } from "@codex/adventure-engine";
  let { scenarios }: { scenarios: ScenarioItem[] } = $props();

  const STATUS = {
    open: { label: "Open", icon: "icon-[lucide--circle-dot]" },
    resolved: { label: "Resolved", icon: "icon-[lucide--circle-check]" },
    abandoned: { label: "Left behind", icon: "icon-[lucide--circle-dashed]" },
  } as const;
</script>

<ul class="space-y-3" aria-label="Known situation details">
  {#each scenarios as item (item.id)}
    {@const status = STATUS[item.status] ?? STATUS.open}
    {@const playerEvents = item.events.filter(
      (event) => event.visibility === "player",
    )}
    <li
      class="space-y-2 rounded-lg border border-theme-border bg-theme-surface p-3"
    >
      <div class="flex items-start justify-between gap-3">
        <p class="min-w-0 text-sm font-semibold leading-snug text-theme-text">
          {item.playerVisible.lead}
        </p>
        <span
          class="inline-flex shrink-0 items-center gap-1 rounded-full border border-theme-border bg-theme-bg px-2 py-0.5 text-xs font-medium text-theme-text"
        >
          <span class="{status.icon} h-3 w-3" aria-hidden="true"></span>
          {status.label}
        </span>
      </div>
      <blockquote
        class="border-l-2 border-theme-primary pl-3 text-sm italic leading-relaxed text-theme-text"
      >
        {item.playerVisible.rumour}
      </blockquote>
      {#if playerEvents.length > 0}
        <ul
          class="space-y-1 border-t border-theme-border pt-2 text-xs leading-relaxed text-theme-text"
        >
          {#each playerEvents as event (event.id)}
            <li>{event.text}</li>
          {/each}
        </ul>
      {/if}
    </li>
  {/each}
</ul>
