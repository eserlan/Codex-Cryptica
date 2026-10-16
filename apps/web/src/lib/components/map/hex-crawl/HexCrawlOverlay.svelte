<script lang="ts">
  import { hexToPoint, pointToHex, type HexGridConfig } from "map-engine";
  import type { Point } from "schema";
  import { terrainIcon, type HexRecord } from "hex-crawl-engine";

  let {
    records,
    visible,
    showTerrainIcons,
    gridConfig,
    project,
    unproject,
    viewport,
    zoom,
  }: {
    records: Record<string, HexRecord>;
    /** GM only: the caller passes false for players, guests and Player View. */
    visible: boolean;
    showTerrainIcons: boolean;
    gridConfig: HexGridConfig;
    project: (point: Point) => Point;
    unproject: (point: Point) => Point;
    viewport: { width: number; height: number };
    zoom: number;
  } = $props();

  type OverlayItem = { key: string; x: number; y: number; record: HexRecord };
  type HexBounds = { minQ: number; maxQ: number; minR: number; maxR: number };
  type Projection = {
    gridConfig: HexGridConfig;
    project: (point: Point) => Point;
    viewport: { width: number; height: number };
  };

  function itemInViewport(
    key: string,
    record: HexRecord,
    q: number,
    r: number,
    projection: Projection,
  ): OverlayItem | null {
    const point = projection.project(
      hexToPoint({ q, r }, projection.gridConfig),
    );
    if (
      point.x < -MARGIN ||
      point.y < -MARGIN ||
      point.x > projection.viewport.width + MARGIN ||
      point.y > projection.viewport.height + MARGIN
    ) {
      return null;
    }
    return { key, x: point.x, y: point.y, record };
  }

  function collectByCoordinates(
    records: Record<string, HexRecord>,
    bounds: HexBounds,
    projection: Projection,
  ): OverlayItem[] {
    const items: OverlayItem[] = [];
    for (let q = bounds.minQ; q <= bounds.maxQ; q++) {
      for (let r = bounds.minR; r <= bounds.maxR; r++) {
        const key = `${q},${r}`;
        const record = records[key];
        if (!record) continue;
        const item = itemInViewport(key, record, q, r, projection);
        if (item) items.push(item);
      }
    }
    return items;
  }

  function collectByStoredRecords(
    records: Record<string, HexRecord>,
    keys: string[],
    bounds: HexBounds,
    projection: Projection,
  ): OverlayItem[] {
    const items: OverlayItem[] = [];
    for (const key of keys) {
      const match = /^(-?\d+),(-?\d+)$/.exec(key);
      if (!match) continue;
      const q = Number(match[1]);
      const r = Number(match[2]);
      if (
        q < bounds.minQ ||
        q > bounds.maxQ ||
        r < bounds.minR ||
        r > bounds.maxR
      ) {
        continue;
      }
      const item = itemInViewport(key, records[key], q, r, projection);
      if (item) items.push(item);
    }
    return items;
  }

  /** Return at most `limit` own keys, or null as soon as the set exceeds it. */
  function boundedRecordKeys(
    records: Record<string, HexRecord>,
    limit: number,
  ): string[] | null {
    const keys: string[] = [];
    for (const key in records) {
      if (!Object.hasOwn(records, key)) continue;
      if (keys.length === limit) return null;
      keys.push(key);
    }
    return keys;
  }

  /** Hexes with records, culled to the viewport plus a margin. */
  const MARGIN = 80;
  // Bound both work and DOM nodes during extreme zoom-out or dense-map cases.
  const MAX_CANDIDATES = 25_000;
  const MAX_RENDER_ITEMS = 2_000;
  const shown = $derived.by(() => {
    if (!visible) return [];
    const corners = [
      unproject({ x: -MARGIN, y: -MARGIN }),
      unproject({ x: viewport.width + MARGIN, y: -MARGIN }),
      unproject({ x: -MARGIN, y: viewport.height + MARGIN }),
      unproject({ x: viewport.width + MARGIN, y: viewport.height + MARGIN }),
    ].map((point) => pointToHex(point, gridConfig));
    const bounds = {
      minQ: Math.min(...corners.map(({ q }) => q)) - 2,
      maxQ: Math.max(...corners.map(({ q }) => q)) + 2,
      minR: Math.min(...corners.map(({ r }) => r)) - 2,
      maxR: Math.max(...corners.map(({ r }) => r)) + 2,
    };
    const candidateCount =
      (bounds.maxQ - bounds.minQ + 1) * (bounds.maxR - bounds.minR + 1);
    // A sparse map can still be scanned safely by its stored records. If both
    // the coordinate area and record set exceed the budget, omit the cosmetic
    // overlay rather than block the main thread or render a misleading subset.
    const projection = { gridConfig, project, viewport };
    let items: OverlayItem[];
    if (candidateCount > MAX_CANDIDATES) {
      const keys = boundedRecordKeys(records, MAX_CANDIDATES);
      if (!keys) return [];
      items = collectByStoredRecords(records, keys, bounds, projection);
    } else {
      items = collectByCoordinates(records, bounds, projection);
    }
    return items.slice(0, MAX_RENDER_ITEMS);
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
