<script lang="ts">
  import { hexToPoint, type HexGridConfig } from "map-engine";
  import {
    parseHexKey,
    parseHexEdgeKey,
    type GeographyProposal,
    type HexEdgeFeature,
    type HexEdgeKey,
    type HexKey,
    type HexTopology,
  } from "hex-crawl-engine";
  import type { Point } from "schema";

  let {
    topology,
    proposal,
    disabledEdges = new Set<HexEdgeKey>(),
    disabledSites = new Set<HexKey>(),
    gridConfig,
    project,
    viewport,
    zoom,
    onToggleEdge,
    onToggleSite,
  }: {
    topology?: HexTopology;
    proposal?: GeographyProposal | null;
    disabledEdges?: ReadonlySet<HexEdgeKey>;
    disabledSites?: ReadonlySet<HexKey>;
    gridConfig: HexGridConfig;
    project: (point: Point) => Point;
    viewport: { width: number; height: number };
    zoom: number;
    onToggleEdge?: (key: HexEdgeKey) => void;
    onToggleSite?: (key: HexKey) => void;
  } = $props();

  const pos = (key: string) =>
    project(hexToPoint(parseHexKey(key)!, gridConfig));
  const entries = $derived.by(() => {
    const combined = { ...(topology?.edges ?? {}), ...(proposal?.edges ?? {}) };
    const results: Array<{
      key: string;
      edge: HexEdgeFeature;
      proposed: boolean;
      disabled: boolean;
      a: Point;
      b: Point;
      mid: Point;
      coastA: Point;
      coastB: Point;
    }> = [];
    for (const [key, edge] of Object.entries(combined)) {
      const pair = parseHexEdgeKey(key);
      if (!pair) continue;
      const a = project(hexToPoint(pair[0], gridConfig));
      const b = project(hexToPoint(pair[1], gridConfig));
      if (
        (a.x < -80 && b.x < -80) ||
        (a.y < -80 && b.y < -80) ||
        (a.x > viewport.width + 80 && b.x > viewport.width + 80) ||
        (a.y > viewport.height + 80 && b.y > viewport.height + 80)
      )
        continue;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const px = (-(b.y - a.y) / l...[truncated]