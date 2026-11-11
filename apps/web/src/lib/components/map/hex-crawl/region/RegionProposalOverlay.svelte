<script lang="ts">
  import { hexToPoint, type HexGridConfig } from "map-engine";
  import type { Point } from "schema";
  import {
    terrainIcon,
    terrainLabel,
    type RegionAdjustments,
    type RegionProposal,
    type Terrain,
  } from "hex-crawl-engine";

  /**
   * Proposed terrain drawn over the hex grid. Each proposed hex is a button, so
   * the GM can tap one to change it by hand. Nothing here is saved.
   */
  let {
    proposal,
    adjustments,
    gridConfig,
    project,
    zoom,
    selectedKey,
    onPick,
  }: {
    proposal: RegionProposal;
    adjustments: RegionAdjustments;
    gridConfig: HexGridConfig;
    project: (point: Point) => Point;
    zoom: number;
    selectedKey: string | null;
    onPick: (key: string) => void;
  } = $props();

  const size = $derived(Math.max(28, gridConfig.size * zoom * 1.2));

  const items = $derived(
    Object.entries(proposal.hexes).map(([key, id]) => {
      const [q, r] = key.split(",").map(Number);
      const point = project(hexToPoint({ q, r }, gridConfig));
      const terrain: Terrain = adjustments[key] ?? { kind: "preset", id };
      return {
        key,
        x: point.x,
        y: point.y,
        terrain,
        adjusted: key in adjustments,
        changes: proposal.changes.includes(key),
      };
    }),
  );

  function stop(event: Event) {
    // A tap here picks a proposed hex; it must not also open the hex panel.
    event.stopPropagation();
  }
</script>

<div
  data-testid="region-proposal-overlay"
  class="pointer-events-none absolute inset-0 z-30"
>
  {#each items as item (item.key)}
    <button
      type="button"
      data-testid="region-proposed-hex"
      data-hex={item.key}
      aria-label="Proposed {terrainLabel(item.terrain)} at {item.key}"
      aria-pressed={selectedKey === item.key}
      onpointerdown={stop}
      onpointerup={stop}
      onclick={(event) => {
        stop(event);
        onPick(item.key);
      }}
      class="pointer-events-auto absolute flex items-center justify-center rounded-full border-2 bg-theme-bg/60 text-theme-text {selectedKey ===
      item.key
        ? 'border-theme-primary'
        : item.adjusted
          ? 'border-theme-secondary'
          : item.changes
            ? 'border-dashed border-theme-primary/80'
            : 'border-dashed border-theme-primary/40'}"
      style:left={`${item.x - size / 2}px`}
      style:top={`${item.y - size / 2}px`}
      style:width={`${size}px`}
      style:height={`${size}px`}
    >
      <span class="{terrainIcon(item.terrain)} h-4 w-4" aria-hidden="true"
      ></span>
    </button>
  {/each}
</div>
