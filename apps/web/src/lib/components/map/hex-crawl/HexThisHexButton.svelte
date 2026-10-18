<script lang="ts">
  import { pointToHex } from "map-engine";
  import type { Point } from "schema";
  import {
    canSeeHexCrawl,
    hexGridConfigFor,
    isHexGridType,
    type HexGridFields,
  } from "./hex-crawl-view";
  import { useHexCrawlStore } from "./hex-crawl-context";

  /** Opens the hex panel for the hex a token or pin stands in (FR-003b). */
  let {
    point,
    mapId,
    grid,
    isGM,
    isGuest,
  }: {
    point: Point;
    mapId: string | null;
    grid: HexGridFields;
    isGM: boolean;
    isGuest: boolean;
  } = $props();

  const store = useHexCrawlStore();

  const visible = $derived(
    Boolean(
      store &&
      mapId &&
      canSeeHexCrawl({ isGM, isGuest }) &&
      isHexGridType(grid.gridType) &&
      store.isEnabled(mapId),
    ),
  );

  function openThisHex(event: MouseEvent) {
    if (!store || !mapId) return;
    const hex = pointToHex(point, hexGridConfigFor(grid));
    store.openHex(mapId, hex, event.currentTarget as HTMLElement);
  }
</script>

{#if visible}
  <button
    type="button"
    onclick={openThisHex}
    class="flex items-center justify-center gap-2 rounded-lg border border-theme-border px-3 py-2 text-micro font-bold uppercase tracking-widest text-theme-muted hover:text-theme-text hover:border-theme-primary/40"
  >
    <span class="icon-[lucide--hexagon] h-4 w-4" aria-hidden="true"></span>
    This hex
  </button>
{/if}
