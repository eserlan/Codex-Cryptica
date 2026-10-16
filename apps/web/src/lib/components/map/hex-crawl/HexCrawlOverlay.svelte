<script lang="ts">
  import { hexToPoint, type HexGridConfig } from "map-engine";
  import type { Point } from "schema";
  import { parseHexKey, terrainIcon, type HexRecord } from "hex-crawl-engine";

  let {
    records,
    visible,
    showTerrainIcons,
    gridConfig,
    project,
    viewport,
    zoom,
  }: {
    records: Record<string, HexRecord>;
    /** GM only: the caller passes false for players, guests and Player View. */
    visible: boolean;
    showTerrainIcons: boolean;
    gridConfig: HexGridConfig;
    project: (point: Point) => Point;
    viewport: { width: number; height: number };
    zoom: number;
  } = $props();

  /** Hexes with records, culled to the viewport plus a margin. */
  const MARGIN = 80;
  const shown = $derived.by(() => {
    if (!visible) return [];
    const items: { key: string; x: number; y: number; record: HexRecord }[] =
      [];
    for (const [key, record] of Object.entries(records)) {
      const hex = parseHexKey(key);
      if (!hex) continue;
      const pos = project(hexToPoint(hex, gridConfig));
      if (
        pos.x < -MARGIN ||
        pos.y < -MARGIN ||
        pos.x > viewport.width + MARGIN ||
        pos.y > viewport.height + MARGIN
      ) {
        continue;
      }
      items.push({ key, x: pos.x, y: pos.y, record });
    }
    return items;
  });

  const markerSize = $derived(Math.max(8, gridConfig.size * zoom));
</script>

{#if visible}
  <div
    data-testid="hex-crawl-overlay"
    class="pointer-events-none absolute inset-0 z-20"
  >
    {#each shown as item (item.key)}
      {#if item.record.explored}
        <div
          data-testid="hex-explored-marker"
          class="absolute"
          style:left={`${item.x}px`}
          style:top={`${item.y}px`}
        >
          <div
            class="absolute rounded-full border border-theme-primary/70"
            style:width={`${markerSize}px`}
            style:height={`${markerSize}px`}
            style:left={`${-markerSize / 2}px`}
            style:top={`${-markerSize / 2}px`}
          ></div>
          <span
            class="absolute icon-[lucide--circle-check-big] h-3.5 w-3.5 text-theme-primary bg-theme-bg rounded-full"
            style:left={`${markerSize / 3}px`}
            style:top={`${-markerSize / 2 - 4}px`}
            aria-hidden="true"
          ></span>
        </div>
      {/if}
      {#if showTerrainIcons && item.record.terrain}
        <span
          class="absolute {terrainIcon(
            item.record.terrain,
          )} h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-theme-text drop-shadow"
          style:left={`${item.x}px`}
          style:top={`${item.y}px`}
          aria-hidden="true"
        ></span>
      {/if}
    {/each}
  </div>
{/if}
