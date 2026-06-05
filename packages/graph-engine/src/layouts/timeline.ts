import type { GraphNode } from "../transformer";

export interface TimelineLayoutOptions {
  axis: "x" | "y";
  scale: number; // base pixels between sequential time steps
  jitter: number; // separation on secondary axis
  minYear?: number;
}

export interface YearPositionContext {
  yearPositions: Record<number, number>;
  axis?: "x" | "y";
  sortedEntries?: Array<{ year: number; coord: number }>;
}

export interface TimelineAnchorProjection {
  entityId: string;
  anchorId: string;
  year: number;
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

export function getAnchorTimelineLayout(
  anchors: TimelineAnchorProjection[],
  options: TimelineLayoutOptions,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  if (anchors.length === 0) return positions;

  const groupedByYear: Record<number, TimelineAnchorProjection[]> = {};
  const years: number[] = [];
  for (const anchor of anchors) {
    years.push(anchor.year);
    groupedByYear[anchor.year] ??= [];
    groupedByYear[anchor.year].push(anchor);
  }

  const yearPositions = getSequentialYearPositions(years, options.scale);
  const secondaryAxisOffset = 100;

  for (const [yearValue, yearAnchors] of Object.entries(groupedByYear)) {
    const year = Number(yearValue);
    const primaryCoord = yearPositions[year] ?? 0;
    yearAnchors.forEach((anchor, index) => {
      const jitterCoord =
        (index - (yearAnchors.length - 1) / 2) * options.jitter;
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
 * Nodes with identical years are spread along the secondary axis to prevent occlusion.
 */
export function getTimelineLayout(
  nodes: GraphNode[],
  options: TimelineLayoutOptions,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  // 1. Identify relevant year for each node (priority: date > start_date > end_date)
  const datedNodes = nodes.filter((node) => hasTimelineDate(node));

  if (datedNodes.length === 0) return {};

  const getYear = (n: GraphNode) => {
    return (
      n.data.date?.year ?? n.data.start_date?.year ?? n.data.end_date?.year ?? 0
    );
  };

  // 2. Group by year to handle concurrent events (jitter)
  const groupedByYear: Record<number, GraphNode[]> = {};
  const years: number[] = [];
  for (const node of datedNodes) {
    const year = getYear(node);
    years.push(year);
    if (!groupedByYear[year]) groupedByYear[year] = [];
    groupedByYear[year].push(node);
  }

  // 3. Calculate coordinates (Sequential with Gap Compression)
  const yearPositions = getSequentialYearPositions(years, options.scale);
  const secondaryAxisOffset = 100; // Shift nodes away from ruler area

  for (const [yearStr, yearNodes] of Object.entries(groupedByYear)) {
    const year = Number(yearStr);
    const primaryCoord = yearPositions[year] ?? 0;

    yearNodes.forEach((node, index) => {
      // Offset from center for jitter
      const jitterCoord = (index - (yearNodes.length - 1) / 2) * options.jitter;
      const secondaryCoord = jitterCoord + secondaryAxisOffset;

      if (options.axis === "x") {
        positions[node.data.id] = { x: primaryCoord, y: secondaryCoord };
      } else {
        positions[node.data.id] = { x: secondaryCoord, y: primaryCoord };
      }
    });
  }

  return positions;
}
