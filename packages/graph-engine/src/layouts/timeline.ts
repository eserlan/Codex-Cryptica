import type { GraphNode } from "../transformer";

export interface TimelineLayoutOptions {
  axis: "x" | "y";
  scale: number; // base pixels between sequential time steps
  jitter: number; // separation on secondary axis
  minYear?: number;
  zoom?: number;
}

export interface YearPositionContext {
  yearPositions: Record<number, number>;
  axis?: "x" | "y";
  sortedEntries?: Array<{ year: number; coord: number }>;
}

export const TIMELINE_MONTH_ZOOM_THRESHOLD = 3.0;
export const TIMELINE_DAY_ZOOM_THRESHOLD = 8.0;

export interface TimelineAnchorProjection {
  entityId: string;
  anchorId: string;
  year: number;
}

function parseMonthFromUnitId(unitId?: string): number | undefined {
  if (!unitId) return undefined;
  if (!isNaN(Number(unitId))) return Number(unitId);
  const match = unitId.match(/\d+/);
  if (match) return Number(match[0]);
  const lower = unitId.toLowerCase();
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  for (let i = 0; i < months.length; i++) {
    if (lower.startsWith(months[i])) {
      return i + 1;
    }
  }
  return undefined;
}

/**
 * Calculates a fractional year value from a date with optional month and day.
 */
export function getFractionalYear(date?: {
  year: number;
  month?: number;
  day?: number;
  unitId?: string;
}): number | undefined {
  if (!date) return undefined;
  let val = date.year;
  let month = date.month;
  if (month === undefined && date.unitId !== undefined) {
    month = parseMonthFromUnitId(date.unitId);
  }
  if (month !== undefined) {
    val += (month - 1) / 12;
    if (date.day !== undefined) {
      val += (date.day - 1) / 365;
    }
  }
  return val;
}

/**
 * Quantizes a fractional year based on the current zoom level.
 */
export function getQuantizedYear(val: number, zoom: number = 1.0): number {
  if (zoom < TIMELINE_MONTH_ZOOM_THRESHOLD) {
    return Math.floor(val);
  } else if (zoom < TIMELINE_DAY_ZOOM_THRESHOLD) {
    return Math.floor(val * 12) / 12;
  } else {
    return Math.floor(val * 365) / 365;
  }
}

/**
 * Checks whether a node has any timeline-related date metadata.
 *
 * A node is considered dateable if it has at least one of the following
 * properties defined on its `data` object: `date`, `start_date`, or `end_date`.
 *
 * @param node - The graph node to inspect for timeline date fields.
 * @returns `true` if the node has `date`, `start_date`, or `end_date` defined;
 *          otherwise `false`.
 */
export function hasTimelineDate(node: GraphNode): boolean {
  return Boolean(node.data.date || node.data.start_date || node.data.end_date);
}

/**
 * Calculates sequential positions for a set of years, with gap compression.
 */
export function getSequentialYearPositions(
  years: number[],
  scale: number,
): Record<number, number> {
  const sortedYears = [...new Set(years)].sort((a, b) => a - b);
  const yearPositions: Record<number, number> = {};
  let currentPos = 0;

  if (sortedYears.length > 0) {
    yearPositions[sortedYears[0]] = 0;

    for (let i = 1; i < sortedYears.length; i++) {
      const prevYear = sortedYears[i - 1];
      const year = sortedYears[i];
      const diff = year - prevYear;

      // Base spacing for sequential events
      let spacing = scale;

      // Add "a bit" of space for larger gaps
      if (diff > 100) {
        spacing += scale * 0.8;
      } else if (diff > 20) {
        spacing += scale * 0.4;
      }

      currentPos += spacing;
      yearPositions[year] = currentPos;
    }
  }

  return yearPositions;
}

export function getYearForPosition(
  position: number | { x: number; y: number },
  context: YearPositionContext,
): number | null {
  if (!context.sortedEntries) {
    context.sortedEntries = Object.entries(context.yearPositions)
      .map(([year, coord]) => ({ year: Number(year), coord }))
      .sort((a, b) => a.coord - b.coord);
  }
  const entries = context.sortedEntries;

  if (entries.length === 0) return null;

  const coord =
    typeof position === "number"
      ? position
      : context.axis === "y"
        ? position.y
        : position.x;

  if (coord <= entries[0].coord) return entries[0].year;
  const last = entries[entries.length - 1];
  if (coord >= last.coord) return last.year;

  for (let index = 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const next = entries[index];
    if (coord <= next.coord) {
      const ratio = (coord - previous.coord) / (next.coord - previous.coord);
      return Math.round(previous.year + (next.year - previous.year) * ratio);
    }
  }

  return last.year;
}

export function getPositionForYear(
  year: number,
  context: YearPositionContext,
): number | null {
  if (!context.sortedEntries) {
    context.sortedEntries = Object.entries(context.yearPositions)
      .map(([y, coord]) => ({ year: Number(y), coord }))
      .sort((a, b) => a.year - b.year);
  }
  const entries = context.sortedEntries;
  if (entries.length === 0) return null;

  if (year <= entries[0].year) return entries[0].coord;
  const last = entries[entries.length - 1];
  if (year >= last.year) return last.coord;

  for (let index = 1; index < entries.length; index += 1) {
    const previous = entries[index - 1];
    const next = entries[index];
    if (year <= next.year) {
      const ratio = (year - previous.year) / (next.year - previous.year);
      return previous.coord + (next.coord - previous.coord) * ratio;
    }
  }

  return last.coord;
}

export function getAnchorTimelineLayout(
  anchors: TimelineAnchorProjection[],
  options: TimelineLayoutOptions,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  if (anchors.length === 0) return positions;

  const zoom = options.zoom ?? 1.0;
  const years: number[] = [];
  const groupedByFracYear: Record<number, TimelineAnchorProjection[]> = {};

  for (const anchor of anchors) {
    const quantizedYear = getQuantizedYear(anchor.year, zoom);
    years.push(quantizedYear);
    groupedByFracYear[anchor.year] ??= [];
    groupedByFracYear[anchor.year].push(anchor);
  }

  const yearPositions = getSequentialYearPositions(years, options.scale);
  const secondaryAxisOffset = 100;

  for (const [fracYearStr, groupAnchors] of Object.entries(groupedByFracYear)) {
    const fracYear = Number(fracYearStr);
    const quantizedYear = getQuantizedYear(fracYear, zoom);
    const baseCoord = yearPositions[quantizedYear] ?? 0;
    const fraction = fracYear - quantizedYear;
    const primaryCoord = baseCoord + fraction * options.scale;

    groupAnchors.forEach((anchor, index) => {
      const jitterCoord =
        (index - (groupAnchors.length - 1) / 2) * options.jitter;
      const secondaryCoord = jitterCoord + secondaryAxisOffset;
      const key = `${anchor.entityId}::${anchor.anchorId}`;
      positions[key] =
        options.axis === "x"
          ? { x: primaryCoord, y: secondaryCoord }
          : { x: secondaryCoord, y: primaryCoord };
    });
  }

  return positions;
}

/**
 * Calculates positions for a chronological layout.
 * Nodes with identical exact dates are stacked on top of each other,
 * while nodes with different dates are spread out.
 */
export function getTimelineLayout(
  nodes: GraphNode[],
  options: TimelineLayoutOptions & { yearPositions?: Record<number, number> },
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  const anchorNodeIds = new Set(
    nodes.filter((n) => n.data.isTemporalAnchor).map((n) => n.data.id),
  );

  const hasHandles = (nodeId: string) => {
    for (const anchorId of anchorNodeIds) {
      if (anchorId.startsWith(`${nodeId}::`)) return true;
    }
    return false;
  };

  // 1. Identify relevant year for each node (priority: date > start_date > end_date)
  // Exclude main nodes that have handles to prevent duplication/jittering
  const datedNodes = nodes.filter((node) => {
    if (!hasTimelineDate(node)) return false;
    if (node.data.isTemporalAnchor) return true;
    return !hasHandles(node.data.id);
  });

  if (datedNodes.length === 0) return {};

  const getYear = (n: GraphNode) => {
    const d = n.data.date ?? n.data.start_date ?? n.data.end_date;
    return getFractionalYear(d) ?? 0;
  };

  const zoom = options.zoom ?? 1.0;

  // 2. Extract quantized years for the sequential mapping
  const quantizedYears = datedNodes.map((n) =>
    getQuantizedYear(getYear(n), zoom),
  );

  // 3. Calculate coordinates (Sequential with Gap Compression)
  const yearPositions =
    options.yearPositions ||
    getSequentialYearPositions(quantizedYears, options.scale);

  // Group by exact fractional year to apply jitter (stacking) only to events with the exact same date
  const groupedByFracYear: Record<number, GraphNode[]> = {};
  for (const node of datedNodes) {
    const fracYear = getYear(node);
    if (!groupedByFracYear[fracYear]) {
      groupedByFracYear[fracYear] = [];
    }
    groupedByFracYear[fracYear].push(node);
  }

  const secondaryAxisOffset = 100;

  for (const [fracYearStr, groupNodes] of Object.entries(groupedByFracYear)) {
    const fracYear = Number(fracYearStr);
    const quantizedYear = getQuantizedYear(fracYear, zoom);
    const baseCoord = yearPositions[quantizedYear] ?? 0;
    const fraction = fracYear - quantizedYear;
    const primaryCoord = baseCoord + fraction * options.scale;

    groupNodes.forEach((node, index) => {
      // Offset from center for jitter (stacking concurrent events)
      const jitterCoord =
        (index - (groupNodes.length - 1) / 2) * options.jitter;
      const secondaryCoord = jitterCoord + secondaryAxisOffset;

      if (options.axis === "x") {
        positions[node.data.id] = { x: primaryCoord, y: secondaryCoord };
      } else {
        positions[node.data.id] = { x: secondaryCoord, y: primaryCoord };
      }
    });
  }

  // 4. Assign main node positions to match their primary start handle (or first handle)
  for (const node of nodes) {
    if (!node.data.isTemporalAnchor && hasHandles(node.data.id)) {
      const startHandleId = `${node.data.id}::primary-range-start`;
      const endHandleId = `${node.data.id}::primary-range-end`;

      const targetHandleId = positions[startHandleId]
        ? startHandleId
        : positions[endHandleId]
          ? endHandleId
          : nodes.find(
              (n) =>
                n.data.isTemporalAnchor &&
                n.data.id.startsWith(`${node.data.id}::`),
            )?.data.id;

      if (targetHandleId && positions[targetHandleId]) {
        positions[node.data.id] = { ...positions[targetHandleId] };
      }
    }
  }

  return positions;
}
