<script lang="ts">
  import type {
    AdventureJsonFaction,
    AdventureJsonV1,
  } from "@codex/adventure-engine";
  import AdventureImportReviewCollectionSection, {
    type ReviewCollectionItem,
  } from "./AdventureImportReviewCollectionSection.svelte";
  import AdventureReviewSourceCitation from "./AdventureReviewSourceCitation.svelte";
  import AdventureReviewEpistemicBadge from "./AdventureReviewEpistemicBadge.svelte";
  import AdventureReviewVisibilityControl from "./AdventureReviewVisibilityControl.svelte";

  let {
    draft,
    isLocked,
    onToggleVisibility,
  }: {
    draft: AdventureJsonV1;
    isLocked: boolean;
    onToggleVisibility: (collection: "factions", index: number) => void;
  } = $props();

  const factionEntries = $derived<ReviewCollectionItem<AdventureJsonFaction>[]>(
    draft.factions.map((faction, index) => ({
      item: faction,
      index,
      id: faction.id,
      title: faction.name,
      searchText: `${faction.summary} ${faction.description ?? ""}`,
    })),
  );
</script>

{#if draft.factions.length > 0}
  <AdventureImportReviewCollectionSection
    collectionKey="factions"
    title="Factions"
    emptyMessage="No factions in this module."
    entries={factionEntries}
  >
    {#snippet recordHeaderBadges(entry)}
      {@const faction = entry.item as AdventureJsonFaction}
      <AdventureReviewSourceCitation sourceRef={faction.sourceRef} />
      <span
        class="rounded-full border border-theme-border bg-theme-surface px-2 py-0.5 text-xs font-medium text-theme-text"
      >
        {faction.visibility === "gm-only" ? "GM-only" : "Player-visible"}
      </span>
      <AdventureReviewEpistemicBadge status={faction.epistemicStatus} />
    {/snippet}
    {#snippet recordBody(entry)}
      {@const faction = entry.item as AdventureJsonFaction}
      <p class="text-sm text-theme-text">{faction.summary}</p>
      <AdventureReviewVisibilityControl
        collection="factions"
        index={entry.index}
        visibility={faction.visibility}
        label={`faction ${faction.name}`}
        disabled={isLocked}
        onToggle={() => onToggleVisibility("factions", entry.index)}
      />
    {/snippet}
  </AdventureImportReviewCollectionSection>
{/if}
