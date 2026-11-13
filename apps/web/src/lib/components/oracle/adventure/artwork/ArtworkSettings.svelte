<script lang="ts">
  import type { ArtworkPreferences } from "#lib/services/adventure/artwork/artwork-preferences.js";
  import type { CollectionDownloadResult } from "#lib/services/adventure/artwork/collection-downloads.js";
  import ArtworkCollections, {
    type CollectionPackItem,
  } from "./ArtworkCollections.svelte";

  let {
    preferences,
    collections,
    automaticCacheBytes = 0,
    privateSnapshotBytes = 0,
    onInstallCollection,
    onRemoveCollection,
    onClearAutomaticCache,
  }: {
    preferences: ArtworkPreferences;
    collections?: readonly CollectionPackItem[];
    automaticCacheBytes?: number;
    privateSnapshotBytes?: number;
    onInstallCollection?: (
      id: string,
      signal: AbortSignal,
      onProgress: (completed: number, total: number) => void,
    ) => Promise<CollectionDownloadResult>;
    onRemoveCollection?: (id: string) => Promise<void>;
    onClearAutomaticCache?: () => Promise<void>;
  } = $props();
  let enabled = $state(false);
  let saved = $state(true);
  $effect(() => {
    enabled = preferences.enabled;
    return preferences.subscribe((value) => {
      enabled = value;
    });
  });
</script>

<section class="rounded-lg border border-theme-border bg-theme-surface p-3">
  <label class="flex min-h-10 items-center gap-3 text-sm text-theme-text">
    <input
      type="checkbox"
      checked={enabled}
      onchange={(event) => {
        saved = preferences.setEnabled(event.currentTarget.checked);
      }}
    />
    Show adventure illustrations
  </label>
  <p class="text-xs text-theme-text">
    This setting applies to this device. Your saved choices are kept.
  </p>
  {#if !saved}<p role="status" class="mt-2 text-xs text-theme-text">
      This change may not be remembered after you close the app.
    </p>{/if}
  {#if collections && onInstallCollection && onRemoveCollection}
    <ArtworkCollections
      {collections}
      {automaticCacheBytes}
      {privateSnapshotBytes}
      onInstall={onInstallCollection}
      onRemove={onRemoveCollection}
      {onClearAutomaticCache}
    />
  {/if}
</section>
