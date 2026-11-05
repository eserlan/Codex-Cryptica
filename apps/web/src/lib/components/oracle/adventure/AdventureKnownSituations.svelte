<script lang="ts">
  import type { ScenarioItem } from "@codex/adventure-engine";
  let { scenarios }: { scenarios: ScenarioItem[] } = $props();
</script>

<ul class="space-y-1" aria-label="Known situation details">
  {#each scenarios as item (item.id)}
    <li class="rounded-md border border-theme-border px-2 py-1">
      <p class="text-sm font-medium text-theme-text">
        {item.playerVisible.rumour}
      </p>
      <p class="text-xs text-theme-text">
        {item.playerVisible.lead} · {item.status}
      </p>
      {#each item.events.filter((event) => event.visibility === "player") as event (event.id)}
        <p class="text-xs text-theme-text">{event.text}</p>
      {/each}
    </li>
  {/each}
</ul>
