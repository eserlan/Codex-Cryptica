<script lang="ts">
  import type {
    AdventureJsonActor,
    AdventureJsonLocation,
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
      collection: "locations" | "actors" | "factions",
      index: number,
    ) => void;
  } = $props();

  const unresolvedByEntityId = $derived(
    countUnresolvedByEntityId(draft.unresolved),
  );

  const locationEntries = $derived<
    ReviewCollectionItem<AdventureJsonLocation>[]
  >(
    draft.locations.map((loc, index) => ({
      item: loc,
      index,
      id: loc.id,
      title: loc.name,
      searchText: `${loc.summary} ${loc.description ?? ""}`,
    })),
  );

  const actorEntries = $derived<ReviewCollectionItem<AdventureJsonActor>[]>(
    draft.actors.map((actor, index) => ({
      item: actor,
      index,
      id: actor.id,
      title: actor.name,
      subtitle: actor.role,
      searchText: `${actor.summary} ${actor.motivation ?? ""} ${actor.description ?? ""}`,
    })),
  );
</script>

<AdventureImportReviewCollectionSection
  collectionKey="locations"
  title="Locations"
  emptyMessage="No locations in this module."
  entries={locationEntries}
>
  {#snippet recordHeaderBadges(entry)}
    {@const loc = entry.item as AdventureJsonLocation}
    <AdventureReviewSourceCitation sourceRef={loc.sourceRef} />
    <AdventureReviewUnresolvedMarker
      entityId={loc.id}
      count={unresolvedByEntityId.get(loc.id) ?? 0}
    />
    <span
      class="rounded-full border border-theme-border bg-theme-surface px-2 py-0.5 text-xs font-medium text-theme-text"
    >
      {loc.visibility === "gm-only" ? "GM-only" : "Player-visible"}
    </span>
    <AdventureReviewEpistemicBadge status={loc.epistemicStatus} />
  {/snippet}
  {#snippet recordBody(entry)}
    {@const loc = entry.item as AdventureJsonLocation}
    <p class="text-sm text-theme-text">{loc.summary}</p>
    {#if loc.description}
      <p class="text-xs text-theme-text">{loc.description}</p>
    {/if}
    <AdventureReviewVisibilityControl
      collection="locations"
      index={entry.index}
      visibility={loc.visibility}
      label={`location ${loc.name}`}
      disabled={isLocked}
      onToggle={() => onToggleVisibility("locations", entry.index)}
    />
  {/snippet}
</AdventureImportReviewCollectionSection>

<AdventureImportReviewCollectionSection
  collectionKey="actors"
  title="Actors"
  emptyMessage="No actors in this module."
  entries={actorEntries}
>
  {#snippet recordHeaderBadges(entry)}
    {@const actor = entry.item as AdventureJsonActor}
    <AdventureReviewSourceCitation sourceRef={actor.sourceRef} />
    <AdventureReviewUnresolvedMarker
      entityId={actor.id}
      count={unresolvedByEntityId.get(actor.id) ?? 0}
    />
    <span
      class="rounded-full border border-theme-border bg-theme-surface px-2 py-0.5 text-xs font-medium text-theme-text"
    >
      {actor.visibility === "gm-only" ? "GM-only" : "Player-visible"}
    </span>
    <AdventureReviewEpistemicBadge status={actor.epistemicStatus} />
  {/snippet}
  {#snippet recordBody(entry)}
    {@const actor = entry.item as AdventureJsonActor}
    <p class="text-sm text-theme-text">{actor.summary}</p>
    {#if actor.motivation}
      <p class="text-xs text-theme-text">
        Motivation: {actor.motivation}
      </p>
    {/if}
    <AdventureReviewVisibilityControl
      collection="actors"
      index={entry.index}
      visibility={actor.visibility}
      label={`actor ${actor.name}`}
      disabled={isLocked}
      onToggle={() => onToggleVisibility("actors", entry.index)}
    />
  {/snippet}
</AdventureImportReviewCollectionSection>
