import { hexToPoint, type HexGridConfig } from "map-engine";
import {
  parseHexKey,
  parseHexEdgeKey,
  type HexEdgeFeatureKey,
  type HexEdgeFeatureKind,
  type GeographyProposal,
  type HexEdgeFeature,
  type HexEdgeKey,
  type HexKey,
  type HexTopology,
  type SettlementSite,
} from "hex-crawl-engine";
import type { Point } from "schema";

export interface EdgeItem {
  key: HexEdgeKey;
  edge: HexEdgeFeature;
  proposedFeatures: HexEdgeFeatureKind[];
  disabledFeatures: ReadonlySet<HexEdgeFeatureKey>;
  a: Point;
  b: Point;
  mid: Point;
  coastA: Point;
  coastB: Point;
}
export interface SiteItem {
  key: HexKey;
  site: SettlementSite;
  proposed: boolean;
  disabled: boolean;
  point: Point;
}
export interface Projection {
  gridConfig: HexGridConfig;
  project: (point: Point) => Point;
  viewport: { width: number; height: number };
  zoom: number;
}

const withinViewport = (p: Point, viewport: Projection["viewport"]): boolean =>
  p.x >= -80 &&
  p.y >= -80 &&
  p.x <= viewport.width + 80 &&
  p.y <= viewport.height + 80;

function edgePoints(
  a: Point,
  b: Point,
  config: Projection,
): Pick<EdgeItem, "mid" | "coastA" | "coastB"> {
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const dx =
    (-(b.y - a.y) / length) * config.gridConfig.size * config.zoom * 0.5;
  const dy =
    ((b.x - a.x) / length) * config.gridConfig.size * config.zoom * 0.5;
  return {
    mid,
    coastA: { x: mid.x - dx, y: mid.y - dy },
    coastB: { x: mid.x + dx, y: mid.y + dy },
  };
}

function toEdgeItem(
  key: HexEdgeKey,
  edge: HexEdgeFeature,
  config: Projection,
  proposedFeatures: HexEdgeFeatureKind[],
  disabledFeatures: ReadonlySet<HexEdgeFeatureKey>,
): EdgeItem | null {
  const pair = parseHexEdgeKey(key);
  if (!pair) return null;
  const a = config.project(hexToPoint(pair[0], config.gridConfig));
  const b = config.project(hexToPoint(pair[1], config.gridConfig));
  if (
    !withinViewport(a, config.viewport) &&
    !withinViewport(b, config.viewport)
  )
    return null;
  return {
    key,
    edge,
    proposedFeatures,
    disabledFeatures,
    a,
    b,
    ...edgePoints(a, b, config),
  };
}

export function visibleGeographyEdges(
  topology: HexTopology | undefined,
  proposal: GeographyProposal | null | undefined,
  disabled: ReadonlySet<HexEdgeFeatureKey>,
  config: Projection,
): EdgeItem[] {
  const existing = topology?.edges ?? {};
  const features = { ...existing, ...(proposal?.edges ?? {}) };
  return Object.entries(features).flatMap(([key, feature]) => {
    const item = toEdgeItem(
      key,
      feature,
      config,
      (["river", "road", "coast"] as const).filter(
        (kind) =>
          proposal?.edges[key]?.[kind] !== undefined &&
          JSON.stringify(proposal.edges[key][kind]) !==
            JSON.stringify(existing[key]?.[kind]),
      ),
      disabled,
    );
    return item ? [item] : [];
  });
}

export function visibleGeographySites(
  topology: HexTopology | undefined,
  proposal: GeographyProposal | null | undefined,
  disabled: ReadonlySet<HexKey>,
  config: Projection,
): SiteItem[] {
  const sites = { ...(topology?.sites ?? {}), ...(proposal?.sites ?? {}) };
  return Object.entries(sites).flatMap(([key, site]) => {
    const hex = parseHexKey(key);
    if (!hex) return [];
    const point = config.project(hexToPoint(hex, config.gridConfig));
    return withinViewport(point, config.viewport)
      ? [
          {
            key,
            site,
            point,
            proposed: Boolean(proposal && key in proposal.sites),
            disabled: disabled.has(key),
          },
        ]
      : [];
  });
}
