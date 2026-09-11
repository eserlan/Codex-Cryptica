/**
 * Mechanical (non-AI) layout for a star system's "side view" diagram: star on
 * the left, major bodies stretched out along a linear AU scale to the right
 * (falling back to list order when a body has no `distanceAU`), with
 * moons/stations offset near the parent body named in their `parentName`
 * field. Pure and deterministic — same bodies in, same layout out — so it can
 * be rendered as inline SVG without a charting library.
 */

import type { StarSystemBody } from "./public-star-system";

export interface StarSystemDiagramNode {
  name: string;
  type: string;
  x: number;
  y: number;
  radius: number;
  isMoon: boolean;
  /** Resolved AU distance for a primary (real or, absent real data, a synthetic 1/2/3... placeholder). Undefined for moons/orphans. */
  distanceAU?: number;
}

export interface StarSystemDiagramGridline {
  au: number;
  x: number;
}

export interface StarSystemDiagramLayout {
  width: number;
  height: number;
  star: { x: number; y: number; radius: number };
  nodes: StarSystemDiagramNode[];
  /** Vertical AU reference lines at "nice" intervals, scaled linearly so ruler-eyeballing distance ratios (and travel times) actually works. */
  auGridlines: StarSystemDiagramGridline[];
}

const STAR_RADIUS = 26;
const START_X = 60;
const PRIMARY_SPACING = 104;
const CENTER_Y = 120;
const MOON_GAP = 30;
const BOTTOM_MARGIN = 40;
const DEFAULT_PRIMARY_RADIUS = 14;
const DEFAULT_MOON_RADIUS = 7;

/** Gap between the star's edge and the ~0 AU reference point. */
const AU_ORIGIN_GAP = 40;
/** Linear pixels per AU — true to relative distance, not compressed, so the gridlines are actually usable for travel-time estimates. */
const AU_PIXELS_PER_AU = 22;
/** Extra clearance (beyond the two bodies' own radii) enforced between adjacent primaries, so closely-spaced AUs don't visually overlap. */
const MIN_PRIMARY_GAP_PADDING = 40;
/** Rough average glyph width (px) at the primary label's 10px font-size, for estimating label width from name length. */
const LABEL_CHAR_WIDTH = 5.6;
/** Extra clearance enforced between two primaries' name labels, beyond their estimated half-widths. */
const LABEL_GAP_PADDING = 10;

function estimateLabelHalfWidth(name: string): number {
  return (name.length * LABEL_CHAR_WIDTH) / 2;
}

const PRIMARY_RADII: ReadonlyArray<readonly [RegExp, number]> = [
  [/gas giant/i, 26],
  [/ice giant/i, 22],
  [/ringed/i, 20],
  [/ocean/i, 17],
  [/temperate/i, 16],
  [/scorched|rock/i, 13],
  [/rogue|planetoid/i, 12],
  [/asteroid/i, 11],
  [/station|habitat|platform|outpost/i, 9],
];

const MOON_RADII: ReadonlyArray<readonly [RegExp, number]> = [
  [/station|habitat|platform/i, 6],
];

function radiusForType(type: string, isMoon: boolean): number {
  const table = isMoon ? MOON_RADII : PRIMARY_RADII;
  for (const [pattern, radius] of table) {
    if (pattern.test(type)) return radius;
  }
  return isMoon ? DEFAULT_MOON_RADIUS : DEFAULT_PRIMARY_RADIUS;
}

/** Approximate, thematically-legible color per primary body type — Jupiter-tan for a gas giant, ocean blue for an ocean world, etc. Undefined for a type with no match, so the caller can fall back to a flat theme color. */
const PRIMARY_BODY_COLORS: ReadonlyArray<readonly [RegExp, string]> = [
  [/gas giant/i, "#e0a458"],
  [/ice giant/i, "#7ec8e3"],
  [/ringed/i, "#d9b56c"],
  [/ocean/i, "#3a8fb7"],
  [/temperate/i, "#5fae6b"],
  [/scorched|rock/i, "#c1553a"],
  [/rogue|planetoid/i, "#8d7b99"],
  [/station|habitat|platform|outpost/i, "#9aa5b1"],
];

export function colorForBodyType(type: string): string | undefined {
  for (const [pattern, color] of PRIMARY_BODY_COLORS) {
    if (pattern.test(type)) return color;
  }
  return undefined;
}

/** A body is a satellite when its parentName resolves to a different body in the same list. */
function isSatellite(
  body: StarSystemBody,
  byName: Map<string, StarSystemBody>,
): boolean {
  if (!body.parentName) return false;
  const parent = byName.get(body.parentName);
  return !!parent && parent !== body;
}

/**
 * The prompt tells the AI never to include the star(s) as a "bodies" entry,
 * but a slip there would otherwise render the star twice (once as the
 * mechanical star icon, once as a phantom "planet") and strand every real
 * planet as its moon. Drop anything whose type reads as stellar rather than
 * planetary/artificial before laying anything out, so the diagram stays
 * correct even if a draft violates the prompt.
 */
const STELLAR_TYPE_PATTERN = /\b(star|dwarf|sun|pulsar|quasar|nova)\b/i;

function isStellarBody(body: StarSystemBody): boolean {
  return STELLAR_TYPE_PATTERN.test(body.type);
}

/** "Nice" AU gridline spacing for the system's outermost body. */
function auGridStep(maxAU: number): number {
  if (maxAU <= 2) return 0.5;
  if (maxAU <= 5) return 1;
  if (maxAU <= 20) return 5;
  if (maxAU <= 50) return 10;
  return 20;
}

function buildAuGridlines(
  maxAU: number,
  auToX: (au: number) => number,
): StarSystemDiagramGridline[] {
  if (maxAU <= 0) return [];
  const step = auGridStep(maxAU);
  const gridlines: StarSystemDiagramGridline[] = [];
  for (let au = step; au <= maxAU + step * 0.5; au += step) {
    gridlines.push({ au: Math.round(au * 10) / 10, x: auToX(au) });
  }
  return gridlines;
}

/** Build a mechanical layout: star, then each body positioned by AU distance (or list order, absent real data). */
export function buildStarSystemDiagram(
  allBodies: readonly StarSystemBody[],
): StarSystemDiagramLayout {
  const bodies = allBodies.filter((body) => !isStellarBody(body));
  const byName = new Map(bodies.map((body) => [body.name, body]));
  const primaries = bodies.filter((body) => !isSatellite(body, byName));
  const satellitesByParent = new Map<string, StarSystemBody[]>();
  for (const body of bodies) {
    if (!isSatellite(body, byName)) continue;
    const list = satellitesByParent.get(body.parentName!) ?? [];
    list.push(body);
    satellitesByParent.set(body.parentName!, list);
  }

  const auOrigin = START_X + STAR_RADIUS + AU_ORIGIN_GAP;
  const auToX = (au: number) => auOrigin + Math.max(au, 0) * AU_PIXELS_PER_AU;

  // Resolve every primary's AU distance — real if given, otherwise a
  // synthetic 1/2/3... placeholder that preserves list order.
  const resolved = primaries.map((body, index) => ({
    body,
    radius: radiusForType(body.type, false),
    au: body.distanceAU ?? index + 1,
  }));

  // Position left-to-right by AU, nudging apart anything the linear scale
  // would otherwise cram together (e.g. two rocky worlds 0.2 AU apart) —
  // both by the bodies' own radii and, separately, by their name labels'
  // estimated width, so two short/small bodies with long names don't end up
  // with overlapping text even though their circles don't touch.
  const byAU = [...resolved].sort((a, b) => a.au - b.au);
  const xByName = new Map<string, number>();
  let previousX: number | undefined;
  let previousRadius = 0;
  let previousLabelHalfWidth = 0;
  for (const entry of byAU) {
    let x = auToX(entry.au);
    const labelHalfWidth = estimateLabelHalfWidth(entry.body.name);
    if (previousX !== undefined) {
      const radiusGap = previousRadius + entry.radius + MIN_PRIMARY_GAP_PADDING;
      const labelGap =
        previousLabelHalfWidth + labelHalfWidth + LABEL_GAP_PADDING;
      const minGap = Math.max(radiusGap, labelGap);
      if (x < previousX + minGap) x = previousX + minGap;
    }
    xByName.set(entry.body.name, x);
    previousX = x;
    previousRadius = entry.radius;
    previousLabelHalfWidth = labelHalfWidth;
  }

  const nodes: StarSystemDiagramNode[] = [];
  let maxBottom = CENTER_Y + STAR_RADIUS;
  let maxX = auOrigin;

  for (const { body, radius, au } of resolved) {
    const x = xByName.get(body.name)!;
    nodes.push({
      name: body.name,
      type: body.type,
      x,
      y: CENTER_Y,
      radius,
      isMoon: false,
      distanceAU: au,
    });
    maxBottom = Math.max(maxBottom, CENTER_Y + radius);
    maxX = Math.max(maxX, x);

    // Moons always sit directly below their planet, in a single straight
    // vertical line, stacked outward the further out they orbit.
    const moons = satellitesByParent.get(body.name) ?? [];
    let moonBottom = CENTER_Y + radius;
    moons.forEach((moon) => {
      const moonRadius = radiusForType(moon.type, true);
      const moonY = moonBottom + MOON_GAP;
      nodes.push({
        name: moon.name,
        type: moon.type,
        x,
        y: moonY,
        radius: moonRadius,
        isMoon: true,
      });
      moonBottom = moonY + moonRadius;
      maxBottom = Math.max(maxBottom, moonBottom);
    });
  }

  // Defensive: a satellite whose parentName didn't survive validation (should
  // not happen after parseStarSystemBodies, but local callers can hand-build
  // bodies directly) still gets placed rather than silently dropped.
  let orphanX = maxX + PRIMARY_SPACING;
  for (const body of bodies) {
    if (!isSatellite(body, byName)) continue;
    if (nodes.some((node) => node.name === body.name)) continue;
    const radius = radiusForType(body.type, true);
    nodes.push({
      name: body.name,
      type: body.type,
      x: orphanX,
      y: CENTER_Y,
      radius,
      isMoon: true,
    });
    maxBottom = Math.max(maxBottom, CENTER_Y + radius);
    maxX = Math.max(maxX, orphanX);
    orphanX += PRIMARY_SPACING / 2;
  }

  const maxAU = resolved.length ? Math.max(...resolved.map((r) => r.au)) : 0;
  const auGridlines = buildAuGridlines(maxAU, auToX);
  const gridlineMaxX = auGridlines.length
    ? auGridlines[auGridlines.length - 1].x
    : auOrigin;

  return {
    width: Math.max(maxX, gridlineMaxX) + STAR_RADIUS + 40,
    height: maxBottom + BOTTOM_MARGIN,
    star: { x: START_X, y: CENTER_Y, radius: STAR_RADIUS },
    nodes,
    auGridlines,
  };
}
