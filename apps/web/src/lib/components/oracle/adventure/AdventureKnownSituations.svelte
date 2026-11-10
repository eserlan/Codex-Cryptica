<script lang="ts">
  import type { ScenarioItem } from "@codex/adventure-engine";
  import AdventureKnownSituation from "./AdventureKnownSituation.svelte";

  let {
    scenarios,
    focusedId = null,
    disabled = false,
    onFollow,
  }: {
    scenarios: ScenarioItem[];
    focusedId?: string | null;
    disabled?: boolean;
    onFollow?: (scenarioId: string | null) => void;
  } = $props();
</script>

<ul class="space-y-3" aria-label="Known situation details">
  {#each scenarios as item (item.id)}
    <AdventureKnownSituation
      {item}
      followed={focusedId === item.id}
      {disabled}
      onFollow={onFollow
        ? () => onFollow(focusedId === item.id ? null : item.id)
        : undefined}
    />
  {/each}
</ul>
