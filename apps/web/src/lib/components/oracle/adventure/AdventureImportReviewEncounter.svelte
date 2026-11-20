<script lang="ts">
  import type {
    AdventureJsonEncounter,
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
    onToggleVisibility: (collection: "encounters", index: number) => void;
  } = $props();

  const encounterEntries = $derived<
    ReviewCollectionItem<AdventureJsonEncounter>[]
  >(
    draft.encounters.map((encounter, index) => ({
      item: encounter,
      index,
      id: encounter.id,
      title: encounter.title ?? encounter.id,
      searchText: encounter.description,
    })),
  );
</script>

<AdventureImportReviewCollectionSection
  collectionKey="encounters"
  title="Encounters"
  emptyMessage="No encounters in this module."
  entries={encounterEntries}
>
  {#snippet recordHeaderBadges(entry)}
    {@const encounter = entry.item as AdventureJsonEncounter}
    <AdventureReviewSourceCitation sourceRef={encounter.sourceRef} />
    <span
      class="rounded-full border border-theme-border bg-theme-surface px-2 py-0.5 text-xs font-medium text-theme-text"
    >
      {encounter.visibility === "gm-only" ? "GM-only" : "Player-visible"}
    </span>
    <AdventureReviewEpistemicBadge status={encounter.epistemicStatus} />
  {/snippet}
  {#snippet recordBody(entry)}
    {@const encounter = entry.item as AdventureJsonEncounter}
    <p class="text-sm text-theme-text">{encounter.description}</p>
    {#if encounter.alternativeSolutions.length > 0}
      <ul class="space-y-1 pl-4 text-xs text-theme-text">
        {#each encounter.alternativeSolutions as alt}
          <li><strong>{alt.method}:</strong> {alt.description}</li>
        {/each}
      </ul>
    {/if}
    <AdventureReviewVisibilityControl
      collection="encounters"
      index={entry.index}
      visibility={encounter.visibility}
      label={`encounter ${encounter.title ?? encounter.id}`}
      disabled={isLocked}
      onToggle={() => onToggleVisibility("encounters", entry.index)}
    />
  {/snippet}
</AdventureImportReviewCollectionSection>
