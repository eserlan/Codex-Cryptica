/**
 * Mechanical (non-AI) layout for a constellation's star-chart diagram: scales
 * a `ConstellationPattern`'s normalized 0-100 sky-plane coordinates into a
 * fixed SVG viewport and resolves each star's render radius from its
 * brightness. Pure and deterministic — same pattern in, same layout out — so
 * it can be rendered as inline SVG without a charting library, mirroring
 * star-system-diagram.ts's split between layout math and rendering.
 */

import type { ConstellationPattern } from "./public-constellation";

export interface ConstellationDiagramNode {
  name?: string;
  notes?: string;
  x: number;
  y: number;
  radius: number;
}

export interface ConstellationDiagramLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ConstellationDiagramLayout {
  width: number;
  height: number;
  nodes: ConstellationDiagramNode[];
  lines: ConstellationDiagramLine[];
}

const VIEWPORT_SIZE = 320;
const PADDING = 28;
const RADIUS_BY_BRIGHTNESS: Record<string, number> = {
  bright: 4.5,
  moderate: 3.2,
  faint: 2.2,
};
const DEFAULT_RADIUS = 2.8;

function scale(value: number): number {
  const usable = VIEWPORT_SIZE - PADDING * 2;
  return PADDING + (Math.max(0, Math.min(100, value)) / 100) * usable;
}

/** Build a mechanical sky-plane layout from a constellation's star pattern. */
export function buildConstellationDiagram(
  pattern: ConstellationPattern | undefined,
): ConstellationDiagramLayout {
  const stars = pattern?.stars ?? [];
  const nodes: ConstellationDiagramNode[] = stars.map((star) => ({
    name: star.name,
    notes: star.notes,
    x: scale(star.x),
    y: scale(star.y),
    radius: RADIUS_BY_BRIGHTNESS[star.brightness ?? ""] ?? DEFAULT_RADIUS,
  }));

  const lines: ConstellationDiagramLine[] = (pattern?.lines ?? [])
    .filter(
      ([a, b]) => a >= 0 && b >= 0 && a < nodes.length && b < nodes.length,
    )
    .map(([a, b]) => ({
      x1: nodes[a].x,
      y1: nodes[a].y,
      x2: nodes[b].x,
      y2: nodes[b].y,
    }));

  return { width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, nodes, lines };
}
