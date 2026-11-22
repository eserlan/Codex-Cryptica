<script lang="ts">
  import type {
    AdventureJsonClue,
    AdventureJsonItem,
    AdventureJsonRumour,
    AdventureJsonV1,
  } from "@codex/adventure-engine";
  import AdventureImportReviewCollectionSection, {
    type ReviewCollectionItem,
  } from "./AdventureImportReviewCollectionSection.svelte";
  import {
    countUnresolvedByEntityId,
    snippetTitle,
  } from "./adventure-review-collection-helpers.js";
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
      collection: "clues" | "rumours" | "items",
      index: number,
    ) => void;
  } = $props();

  const unresolvedByEntityId = $derived(
    countUnresolvedByEntityId(draft.unresolved),
  );

  const clueEntries = $derived<ReviewCollectionItem<AdventureJsonClue>[]>(
    draft.clues.map((clue, index) => ({
      item: clue,
      index,
      id: clue.id,
      title:
        clue.visibility === "gm-only"
          ? "GM-only clue"
          : snippetTitle(clue.text, clue.id),
      searchText: `${clue.text} ${clue.reveals ?? ""}`,
    })),
  );

  const rumourEntries = $derived<ReviewCollectionItem<AdventureJsonRumour>[]>(
    draft.rumours.map((rumour, index) => ({
      item: rumour,
      index,
      id: rumour.id,
      title:
        rumour.visibility === "gm-only"
          ? "GM-only rumour"
          : snippetTitle(rumour.text, rumour.id),
      subtitle: rumour.truth,
      searchText: rumour.text,
    })),
  );

  const itemEntries = $derived<ReviewCollectionItem<AdventureJsonItem>[]>(
    draft.items.map((item, index) => ({
      item,
      index,
      id: item.id,
      title: item.name,
      searchText: `${item.summary} ${item.description ?? ""}`,
    })),
  );
</script>

<AdventureImportReviewCollectionSection
  collectionKey="clues"
  title="Clues"
  emptyMessage="No clues in this module."
  entries={clueEntries}
>
  {#snippet recordHeaderBadges(entry)}
    {@const clue = entry.item as AdventureJsonClue}
    <AdventureReviewSourceCitation sourceRef={clue.sourceRef} />
    <AdventureReviewUnresolvedMarker
      entityId={clue.id}
      count={unresolvedByEntityId.get(clue.id) ?? 0}
    />
    <span
      class="rounded-full border border-theme-border bg-theme-surface px-2 py-0.5 text-xs font-medium text-theme-text"
    >
      {clue.visibility === "gm-only" ? "GM-only" : "Player-visible"}
    </span>
    <AdventureReviewEpistemicBadge status={clue.epistemicStatus} />
  {/snippet}
  {#snippet recordBody(entry)}
    {@const clue = entry.item as AdventureJsonClue}
    <p class="text-sm text-theme-text">{clue.text}</p>
    {#if clue.reveals}
      <p class="text-xs text-theme-text">Reveals: {clue.reveals}</p>
    {/if}
    <AdventureReviewVisibilityControl
      collection="clues"
      index={entry.index}
      visibility={clue.visibility}
      label={`clue ${entry.index + 1}`}
      disabled={isLocked}
      onToggle={() => onToggleVisibility("clues", entry.index)}
    />
  {/snippet}
</AdventureImportReviewCollectionSection>

{#if draft.rumours.length > 0}
  <AdventureImportReviewCollectionSection
    collectionKey="rumours"
    title="Rumours"
    emptyMessage="No rumours in this module."
    entries={rumourEntries}
  >
    {#snippet recordHeaderBadges(entry)}
      {@const rumour = entry.item as AdventureJsonRumour}
      <AdventureReviewSourceCitation sourceRef={rumour.sourceRef} />
      <AdventureReviewUnresolvedMarker
        entityId={rumour.id}
        count={unresolvedByEntityId.get(rumour.id) ?? 0}
      />
      <span
        class="rounded-full border border-theme-border bg-theme-surface px-2 py-0.5 text-xs font-medium text-theme-text"
      >
        {rumour.visibility === "gm-only" ? "GM-only" : "Player-visible"}
      </span>
      <AdventureReviewEpistemicBadge status={rumour.epistemicStatus} />
    {/snippet}
    {#snippet recordBody(entry)}
      {@const rumour = entry.item as AdventureJsonRumour}
      <p class="text-sm text-theme-text">{rumour.text}</p>
      <AdventureReviewVisibilityControl
        collection="rumours"
        index={entry.index}
        visibility={rumour.visibility}
        label={`rumour ${entry.index + 1}`}
        disabled={isLocked}
        onToggle={() => onToggleVisibility("rumours", entry.index)}
      />
    {/snippet}
  </AdventureImportReviewCollectionSection>
{/if}

{#if draft.items.length > 0}
  <AdventureImportReviewCollectionSection
    collectionKey="items"
    title="Items"
    emptyMessage="No items in this module."
    entries={itemEntries}
  >
    {#snippet recordHeaderBadges(entry)}
      {@const item = entry.item as AdventureJsonItem}
      <AdventureReviewSourceCitation sourceRef={item.sourceRef} />
      <AdventureReviewUnresolvedMarker
        entityId={item.id}
        count={unresolvedByEntityId.get(item.id) ?? 0}
      />
      <span
        class="rounded-full border border-theme-border bg-theme-surface px-2 py-0.5 text-xs font-medium text-theme-text"
      >
        {item.visibility === "gm-only" ? "GM-only" : "Player-visible"}
      </span>
      <AdventureReviewEpistemicBadge status={item.epistemicStatus} />
    {/snippet}
    {#snippet recordBody(entry)}
      {@const item = entry.item as AdventureJsonItem}
      <p class="text-sm text-theme-text">{item.summary}</p>
      <AdventureReviewVisibilityControl
        collection="items"
        index={entry.index}
        visibility={item.visibility}
        label={`item ${item.name}`}
        disabled={isLocked}
        onToggle={() => onToggleVisibility("items", entry.index)}
      />
    {/snippet}
  </AdventureImportReviewCollectionSection>
{/if}
