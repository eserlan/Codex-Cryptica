<script lang="ts">
  import {
    ADVENTURE_JSON_COLLECTIONS,
    diffAdventureJsonVersions,
    isAdventureJsonVersionGreater,
    type AdventureJsonV1,
  } from "@codex/adventure-engine";
  import AdventureImportReviewDiffCollection from "./AdventureImportReviewDiffCollection.svelte";

  let {
    previous,
    previousHash = null,
    current,
  }: {
    previous: AdventureJsonV1;
    previousHash?: string | null;
    current: AdventureJsonV1;
  } = $props();

  const diff = $derived(
    diffAdventureJsonVersions(
      $state.snapshot(previous) as AdventureJsonV1,
      $state.snapshot(current) as AdventureJsonV1,
    ),
  );
  const versionIncreased = $derived(
    isAdventureJsonVersionGreater(current.version, previous.version),
  );
  const visibleCollections = $derived(
    ADVENTURE_JSON_COLLECTIONS.map((name) => diff.collections[name]).filter(
      (entry) =>
        entry.added.length > 0 ||
        entry.removed.length > 0 ||
        entry.changed.length > 0,
    ),
  );
  const totalAdded = $derived(
    visibleCollections.reduce((sum, entry) => sum + entry.added.length, 0),
  );
  const totalRemoved = $derived(
    visibleCollections.reduce((sum, entry) => sum + entry.removed.length, 0),
  );
  const totalChanged = $derived(
    visibleCollections.reduce((sum, entry) => sum + entry.changed.length, 0),
  );
</script>

<section
  class="space-y-3 rounded-xl border border-theme-border bg-theme-surface p-5"
  aria-labelledby="review-diff-heading"
  data-testid="adventure-import-diff"
>
  <h2
    id="review-diff-heading"
    class="font-header text-lg font-semibold text-theme-text"
  >
    Changes since the previous approved version
  </h2>
  <p
    class="text-sm text-theme-text"
    data-testid="adventure-import-diff-predecessor"
  >
    Diffing against <span class="font-mono">{previous.id}</span>
    v{previous.version}{#if previousHash}
      · {previousHash.slice(0, 12)}{/if}
  </p>
  {#if !versionIncreased}
    <p
      class="rounded-lg border border-theme-warning/50 bg-theme-warning/10 p-3 text-sm text-theme-text"
      role="note"
      data-testid="adventure-import-diff-version-warning"
    >
      The version number did not increase: this package is v{current.version} and
      the previous approved version is v{previous.version}. It is still saved as
      a separate version because its content differs.
    </p>
  {/if}
  {#if diff.packageChangedFields.length > 0}
    <p
      class="text-sm text-theme-text"
      data-testid="adventure-import-diff-package"
    >
      Package fields changed: {diff.packageChangedFields.join(", ")}
    </p>
  {/if}
  {#if diff.entrySceneChange}
    <p
      class="text-sm text-theme-text"
      data-testid="adventure-import-diff-entry-scene"
    >
      Entry scene changed from
      <span class="font-mono">{diff.entrySceneChange.previousId ?? "none"}</span
      >
      to
      <span class="font-mono">{diff.entrySceneChange.currentId ?? "none"}</span
      >.
    </p>
  {/if}
  <p class="text-sm text-theme-text">
    {totalAdded} added, {totalRemoved} removed, {totalChanged} changed.
  </p>
  {#each visibleCollections as entry (entry.collection)}
    <AdventureImportReviewDiffCollection {entry} />
  {/each}
  {#if diff.unresolved.length > 0}
    <div
      class="space-y-2 rounded-lg border border-theme-warning/40 bg-theme-bg p-3"
      data-testid="adventure-import-diff-unresolved"
    >
      <h3 class="font-semibold text-theme-text">Needs your judgement</h3>
      <ul class="space-y-1 text-sm text-theme-text">
        {#each diff.unresolved as item, index (index)}
          <li>
            <span class="font-mono text-xs">{item.kind}</span>
            {item.reason}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>
