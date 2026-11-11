<script lang="ts">
  import type { ScenarioItem } from "@codex/adventure-engine";
  import AdventureKnownSituation from "./AdventureKnownSituation.svelte";

  let {
    scenarios,
    focusedId = null,
    disabled = false,
    entitiesById = {},
    threads = [],
    canCreateThread = true,
    onFollow,
    onRecordTheory,
    onSaveThread,
  }: {
    scenarios: ScenarioItem[];
    focusedId?: string | null;
    disabled?: boolean;
    entitiesById?: Record<string, { id: string; title: string }>;
    threads?: Array<{ id: string; title: string; status: "open" | "closed" }>;
    canCreateThread?: boolean;
    onFollow?: (scenarioId: string | null) => void;
    onRecordTheory?: (scenarioId: string, text: string) => Promise<void>;
    onSaveThread?: (item: ScenarioItem) => void;
  } = $props();

  function resolveAnchors(anchorRefs?: string[]) {
    return (anchorRefs ?? [])
      .map((ref) => entitiesById[ref])
      .filter((entry): entry is { id: string; title: string } =>
        Boolean(entry),
      );
  }

  function findThread(leadTitle: string) {
    const normalised = leadTitle.trim().toLowerCase();
    return (
      threads.find((t) => t.title.trim().toLowerCase() === normalised) ?? null
    );
  }
</script>

<ul class="space-y-3" aria-label="Known situation details">
  {#each scenarios as item (item.id)}
    <AdventureKnownSituation
      {item}
      followed={focusedId === item.id}
      {disabled}
      anchorEntities={resolveAnchors(item.anchorRefs)}
      linkedThread={findThread(item.playerVisible.lead)}
      {canCreateThread}
      onFollow={onFollow
        ? () => onFollow(focusedId === item.id ? null : item.id)
        : undefined}
      onRecordTheory={onRecordTheory
        ? (text) => onRecordTheory(item.id, text)
        : undefined}
      onSaveThread={onSaveThread ? () => onSaveThread(item) : undefined}
    />
  {/each}
</ul>
