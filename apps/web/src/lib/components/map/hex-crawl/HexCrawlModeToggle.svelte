<script lang="ts">
  import type { HexCrawlStore } from "$lib/stores/hex-crawl/hex-crawl.svelte";
  import { canSeeHexCrawl, isHexGridType } from "./hex-crawl-view";

  let {
    store,
    mapId,
    gridType,
    isGM,
    isGuest,
  }: {
    store: Pick<HexCrawlStore, "isEnabled" | "setEnabled">;
    mapId: string;
    gridType: string;
    isGM: boolean;
    isGuest: boolean;
  } = $props();

  const visible = $derived(
    isHexGridType(gridType) && canSeeHexCrawl({ isGM, isGuest }),
  );
  const enabled = $derived(visible && store.isEnabled(mapId));
</script>

{#if visible}
  <label class="flex items-center justify-between gap-3 cursor-pointer">
    <span class="flex flex-col">
      <span class="text-sm font-medium text-theme-text">Hex Crawl mode</span>
      <span class="text-micro text-theme-muted">
        Track terrain, notes and exploration on each hex.
      </span>
    </span>
    <input
      type="checkbox"
      role="switch"
      class="h-4 w-4 rounded border-theme-border accent-theme-primary"
      checked={enabled}
      aria-label="Hex Crawl mode"
      onchange={(event) =>
        void store.setEnabled(mapId, event.currentTarget.checked)}
    />
  </label>
{/if}
