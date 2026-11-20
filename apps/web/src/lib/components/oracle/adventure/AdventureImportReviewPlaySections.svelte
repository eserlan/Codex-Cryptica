<script lang="ts">
  import type {
    AdventureJsonScene,
    AdventureJsonV1,
  } from "@codex/adventure-engine";
  import AdventureImportReviewCollectionSection, {
    type ReviewCollectionItem,
  } from "./AdventureImportReviewCollectionSection.svelte";
  import { countUnresolvedByEntityId } from "./adventure-review-collection-helpers.js";
  import AdventureReviewUnresolvedMarker from "./AdventureReviewUnresolvedMarker.svelte";
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
    onToggleVisibility: (
      collection: "scenes" | "encounters",
      index: number,
    ) => void;
  } = $props();

  function formatReadAloud(readAloud: string | string[] | undefined): string[] {
    if (!readAloud) return [];
    return Array.isArray(readAloud) ? readAloud : [readAloud];
  }

  const unresolvedByEntityId = $derived(
    countUnresolvedByEntityId(draft.unresolved),
  );

  const sceneEntries = $derived<ReviewCollectionItem<AdventureJsonScene>[]>(
    draft.scenes.map((scene, index) => ({
      item: scene,
      index,
      id: scene.id,
      title: scene.title,
      searchText: `${scene.summary} ${scene.body ?? ""}`,
    })),
  );
</script>

<AdventureImportReviewCollectionSection
  collectionKey="scenes"
  title="Scenes"
  emptyMessage="No scenes in this module."
  entries={sceneEntries}
>
  {#snippet recordHeaderBadges(entry)}
    {@const scene = entry.item as AdventureJsonScene}
    <AdventureReviewSourceCitation sourceRef={scene.sourceRef} />
    <AdventureReviewUnresolvedMarker
      entityId={scene.id}
      count={unresolvedByEntityId.get(scene.id) ?? 0}
    />
    <span
      class="rounded-full border border-theme-border bg-theme-surface px-2 py-0.5 text-xs font-medium text-theme-text"
    >
      {scene.visibility === "gm-only" ? "GM-only" : "Player-visible"}
    </span>
    <AdventureReviewEpistemicBadge status={scene.epistemicStatus} />
  {/snippet}
  {#snippet recordBody(entry)}
    {@const scene = entry.item as AdventureJsonScene}
    <p class="text-sm text-theme-text">{scene.summary}</p>
    {#each formatReadAloud(scene.readAloud) as excerpt}
      <blockquote
        class="border-l-2 border-theme-primary/50 pl-3 text-sm italic text-theme-text"
      >
        {excerpt}
      </blockquote>
    {/each}
    {#if scene.conditions && scene.conditions.length > 0}
      <p class="text-xs text-theme-text">
        Conditions: {scene.conditions.join("; ")}
      </p>
    {/if}
    <AdventureReviewVisibilityControl
      collection="scenes"
      index={entry.index}
      visibility={scene.visibility}
      label={`scene ${scene.title}`}
      disabled={isLocked}
      onToggle={() => onToggleVisibility("scenes", entry.index)}
    />
  {/snippet}
</AdventureImportReviewCollectionSection>
