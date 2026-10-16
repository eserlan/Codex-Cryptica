/**
 * Deterministic 2D layered SVG diagram layout for the Point Crawl Generator
 * (#2479, 177-point-crawl-generator).
 *
 * Assigns non-overlapping `(x, y)` coordinates per node (respecting `layer`,
 * `rail`, and optional interactive pointer-drag `overrides`), and computes SVG
 * cubic/quadratic bezier path strings plus label badge coordinates for every
 * route so loops and parallel edges remain legible without collisions.
 */

import {
  formatRouteConnectionLabel,
  ROLE_LABELS,
  type PointCrawlGate,
  type PointCrawlNetwork,
  type PointCrawlNodeRole,
  type PointCrawlRouteDirection,
  type PointCrawlRouteVisibility,
} from "./point-crawl-state";

export interface PointCrawlNodePositionOverride {
  x: number;
  y: number;
}

export interface PointCrawlDiagramNode {
  id: string;
  index: number;
  name: string;
  role: PointCrawlNodeRole;
  roleLabel: string;
  layer: number;
  rail: number;
  x: number;
  y: number;
  unlocksCount: number;
  fromFallback?: boolean;
}

export interface PointCrawlDiagramEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  direction: PointCrawlRouteDirection;
  visibility: PointCrawlRouteVisibility;
  travelTime: string;
  terrain: string;
  badgeLabel: string;
  gate?: PointCrawlGate;
  isLoopOrShortcut?: boolean;
  fromFallback?: boolean;
  path: string;
  labelX: number;
  labelY: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

export interface PointCrawlDiagramLayout {
  width: number;
  height: number;
  nodes: PointCrawlDiagramNode[];
  edges: PointCrawlDiagramEdge[];
}

const HORIZONTAL_PADDING = 96;
const VERTICAL_PADDING = 76;
const LAYER_SPACING = 190;
const RAIL_SPACING = 118;
const MIN_WIDTH = 760;
const MIN_HEIGHT = 420;

export function buildPointCrawlDiagramLayout(
  crawl: PointCrawlNetwork,
  overrides: Readonly<Record<string, PointCrawlNodePositionOverride>> = {},
): PointCrawlDiagramLayout {
  if (crawl.nodes.length === 0) {
    return { width: MIN_WIDTH, height: MIN_HEIGHT, nodes: [], edges: [] };
  }

  const maxLayer = Math.max(1, ...crawl.nodes.map((n) => n.layer));
  const byLayer = new Map<number, typeof crawl.nodes>();
  for (const node of crawl.nodes) {
    const group = byLayer.get(node.layer) ?? [];
    group.push(node);
    byLayer.set(node.layer, group);
  }
  const maxNodesInLayer = Math.max(
    1,
    ...[...byLayer.values()].map((g) => g.length),
  );

  const width = Math.max(
    MIN_WIDTH,
    HORIZONTAL_PADDING * 2 + maxLayer * LAYER_SPACING,
  );
  const height = Math.max(
    MIN_HEIGHT,
    VERTICAL_PADDING * 2 + Math.max(2, maxNodesInLayer - 1) * RAIL_SPACING,
  );
  const centerY = height / 2;

  const diagramNodes: PointCrawlDiagramNode[] = crawl.nodes.map((node, idx) => {
    const group = byLayer.get(node.layer) ?? [node];
    const indexInLayer = group.findIndex((n) => n.id === node.id);
    const computedRail =
      Number.isFinite(node.rail) && group.length > 1
        ? node.rail
        : indexInLayer - (group.length - 1) / 2;

    const defaultX =
      HORIZONTAL_PADDING +
      (maxLayer > 0
        ? (node.layer / maxLayer) * (width - HORIZONTAL_PADDING * 2)
        : 0);
    const defaultY = Math.min(
      height - VERTICAL_PADDING,
      Math.max(VERTICAL_PADDING, centerY + computedRail * RAIL_SPACING),
    );

    const override = overrides[node.id];
    const x = override
      ? Math.min(width - 40, Math.max(40, Math.round(override.x)))
      : Math.round(defaultX);
    const y = override
      ? Math.min(height - 40, Math.max(40, Math.round(override.y)))
      : Math.round(defaultY);

    return {
      id: node.id,
      index: idx + 1,
      name: node.name,
      role: node.role,
      roleLabel: ROLE_LABELS[node.role] ?? node.role,
      layer: node.layer,
      rail: computedRail,
      x,
      y,
      unlocksCount: node.unlocksRouteIds.length,
      fromFallback: node.fromFallback,
    };
  });

  const nodeMap = new Map(diagramNodes.map((n) => [n.id, n]));
  const pairCounts = new Map<string, number>();

  const diagramEdges: PointCrawlDiagramEdge[] = [];
  for (const route of crawl.routes) {
    const source = nodeMap.get(route.fromNodeId);
    const target = nodeMap.get(route.toNodeId);
    if (!source || !target) continue;

    const pairKey = [source.id, target.id].sort().join("--");
    const seenIndex = pairCounts.get(pairKey) ?? 0;
    pairCounts.set(pairKey, seenIndex + 1);

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.hypot(dx, dy) || 1;
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;

    // Curve loop/shortcut edges or multi-layer skip edges so they don't pass through middle nodes
    const layerSpan = Math.abs(target.layer - source.layer);
    const needsCurve =
      Boolean(route.isLoopOrShortcut) ||
      route.visibility !== "obvious" ||
      layerSpan > 1 ||
      seenIndex > 0;

    let path: string;
    let labelX: number;
    let labelY: number;

    if (!needsCurve) {
      path = `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
      labelX = Math.round(midX);
      labelY = Math.round(midY - 10);
    } else {
      // Perpendicular normal vector
      const nx = -dy / dist;
      const ny = dx / dist;
      const sign = (seenIndex + diagramEdges.length) % 2 === 0 ? -1 : 1;
      const magnitude = 34 + Math.min(36, layerSpan * 12) + seenIndex * 18;
      const ctrlX = midX + nx * magnitude * sign;
      const ctrlY = midY + ny * magnitude * sign;
      path = `M ${source.x} ${source.y} Q ${Math.round(ctrlX)} ${Math.round(ctrlY)} ${target.x} ${target.y}`;
      // Point on quadratic bezier at t = 0.5 is 0.25*P0 + 0.5*P1 + 0.25*P2
      labelX = Math.round(0.25 * source.x + 0.5 * ctrlX + 0.25 * target.x);
      labelY = Math.round(0.25 * source.y + 0.5 * ctrlY + 0.25 * target.y);
    }

    diagramEdges.push({
      id: route.id,
      fromNodeId: route.fromNodeId,
      toNodeId: route.toNodeId,
      direction: route.direction,
      visibility: route.visibility,
      travelTime: route.travelTime,
      terrain: route.terrain,
      badgeLabel: formatRouteConnectionLabel(route),
      gate: route.gate,
      isLoopOrShortcut: route.isLoopOrShortcut,
      fromFallback: route.fromFallback,
      path,
      labelX,
      labelY,
      sourceX: source.x,
      sourceY: source.y,
      targetX: target.x,
      targetY: target.y,
    });
  }

  return {
    width,
    height,
    nodes: diagramNodes,
    edges: diagramEdges,
  };
}
