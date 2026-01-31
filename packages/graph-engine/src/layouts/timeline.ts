import type { GraphNode } from "../transformer";

export interface TimelineLayoutOptions {
  axis: 'x' | 'y';
  scale: number; // base pixels between sequential time steps
  jitter: number; // separation on secondary axis
  minYear?: number;
}

/**
 * Calculates sequential positions for a set of years, with gap compression.
 */
export function getSequentialYearPositions(years: number[], scale: number): Record<number, number> {
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

/**
 * Calculates positions for a chronological layout.
 * Nodes with identical years are spread along the secondary axis to prevent occlusion.
 */
export function getTimelineLayout(nodes: GraphNode[], options: TimelineLayoutOptions): Record<string, { x: number, y: number }> {
  const positions: Record<string, { x: number, y: number }> = {};
  
  // 1. Identify relevant year for each node (priority: date > start_date > end_date)
  const datedNodes = nodes.filter(n => n.data.date || n.data.start_date || n.data.end_date);
  
  if (datedNodes.length === 0) return {};

  const getYear = (n: GraphNode) => {
    return n.data.date?.year ?? n.data.start_date?.year ?? n.data.end_date?.year ?? 0;
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

      if (options.axis === 'x') {
        positions[node.data.id] = { x: primaryCoord, y: secondaryCoord };
      } else {
        positions[node.data.id] = { x: secondaryCoord, y: primaryCoord };
      }
    });
  }

  return positions;
}
