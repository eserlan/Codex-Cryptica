<script lang="ts">
  import RegionProposedHex from "./RegionProposedHex.svelte";
  import { hexToPoint, type HexGridConfig } from "map-engine";
  import type { Point } from "schema";
  import {
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
    labelFor = (key: string) => key,
  }: {
    proposal: RegionProposal;
    adjustments: RegionAdjustments;
    gridConfig: HexGridConfig;
    project: (point: Point) => Point;
    zoom: number;
    selectedKey: string | null;
    onPick: (key: string) => void;
    /** The hex name the GM sees, such as C04. */
    labelFor?: (key: string) => string;
  } = $props();

  const size = $derived(Math.max(44, gridConfig.size * zoom * 1.2));

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
        explored: proposal.exploredChanges.includes(key),
      };
    }),
  );
</script>

<div
  data-testid="region-proposal-overlay"
  class="pointer-events-none absolute inset-0 z-30"
>
  {#each items as item (item.key)}
    <RegionProposedHex
      hexKey={item.key}
      label={labelFor(item.key)}
      terrain={item.terrain}
      x={item.x}
      y={item.y}
      {size}
      selected={selectedKey === item.key}
      adjusted={item.adjusted}
      changes={item.changes}
      explored={item.explored}
      {onPick}
    />
  {/each}
</div>
