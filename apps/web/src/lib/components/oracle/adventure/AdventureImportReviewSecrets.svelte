<script lang="ts">
  import type {
    AdventureJsonEnding,
    AdventureJsonSecret,
    AdventureJsonV1,
  } from "@codex/adventure-engine";
  import AdventureImportReviewCollectionSection, {
    type ReviewCollectionItem,
  } from "./AdventureImportReviewCollectionSection.svelte";
  import { snippetTitle } from "./adventure-review-collection-helpers.js";
  import AdventureReviewSourceCitation from "./AdventureReviewSourceCitation.svelte";
  import AdventureReviewEpistemicBadge from "./AdventureReviewEpistemicBadge.svelte";

  let { draft }: { draft: AdventureJsonV1 } = $props();

  const secretEntries = $derived<ReviewCollectionItem<AdventureJsonSecret>[]>(
    draft.secrets.map((secret, index) => ({
      item: secret,
      index,
      id: secret.id,
      title: snippetTitle(secret.text, secret.id),
      searchText: secret.text,
    })),
  );

  const endingEntries = $derived<ReviewCollectionItem<AdventureJsonEnding>[]>(
    draft.endings.map((ending, index) => ({
      item: ending,
      index,
      id: ending.id,
      title: ending.title ?? ending.id,
      searchText: ending.description,
    })),
  );
</script>

<AdventureImportReviewCollectionSection
  collectionKey="secrets"
  title="Secrets"
  emptyMessage="No secrets in this module."
  entries={secretEntries}
>
  {#snippet recordHeaderBadges(entry)}
    {@const secret = entry.item as AdventureJsonSecret}
    <AdventureReviewSourceCitation sourceRef={secret.sourceRef} />
    <span
      class="inline-flex items-center gap-1 rounded-full border border-theme-border bg-theme-surface px-2 py-0.5 text-xs font-medium text-theme-text"
      data-testid="secret-classification-{entry.index}"
    >
      <span class="icon-[lucide--lock] h-3.5 w-3.5" aria-hidden="true"></span>
      GM-only (locked)
    </span>
    <AdventureReviewEpistemicBadge status={secret.epistemicStatus} />
  {/snippet}
  {#snippet recordBody(entry)}
    {@const secret = entry.item as AdventureJsonSecret}
    <p class="text-sm text-theme-text">{secret.text}</p>
    {#if secret.relatedEntityIds && secret.relatedEntityIds.length > 0}
      <p class="font-mono text-xs text-theme-text">
        Related: {secret.relatedEntityIds.join(", ")}
      </p>
    {/if}
  {/snippet}
</AdventureImportReviewCollectionSection>

{#if draft.endings.length > 0}
  <AdventureImportReviewCollectionSection
    collectionKey="endings"
    title="Endings"
    emptyMessage="No endings in this module."
    entries={endingEntries}
  >
    {#snippet recordHeaderBadges(entry)}
      {@const ending = entry.item as AdventureJsonEnding}
      <AdventureReviewSourceCitation sourceRef={ending.sourceRef} />
      <AdventureReviewEpistemicBadge status={ending.epistemicStatus} />
    {/snippet}
    {#snippet recordBody(entry)}
      {@const ending = entry.item as AdventureJsonEnding}
      <p class="text-sm text-theme-text">{ending.description}</p>
      {#if ending.conditions && ending.conditions.length > 0}
        <p class="text-xs text-theme-text">
          Conditions: {ending.conditions.join("; ")}
        </p>
      {/if}
    {/snippet}
  </AdventureImportReviewCollectionSection>
{/if}
