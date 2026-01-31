import type { GraphNode } from "../transformer";

export interface TimelineLayoutOptions {
  axis: 'x' | 'y';
  scale: number; // base pixels between sequential time steps
  jitter: number; // separation on secondary axis
  minYear?: number;
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

  // 3. Group by year to handle concurrent events (jitter)
  const groupedByYear: Record<number, GraphNode[]> = {};
  for (const node of datedNodes) {
    const year = getYear(node);
    if (!groupedByYear[year]) groupedByYear[year] = [];
    groupedByYear[year].push(node);
  }

  // 4. Calculate coordinates (Sequential with Gap Compression)
  const sortedYears = Object.keys(groupedByYear).map(Number).sort((a, b) => a - b);
  let currentPos = 0;
  const yearPositions: Record<number, number> = {};
  
  if (sortedYears.length > 0) {
    yearPositions[sortedYears[0]] = 0;
    
    for (let i = 1; i < sortedYears.length; i++) {
      const prevYear = sortedYears[i - 1];
      const year = sortedYears[i];
      const diff = year - prevYear;
      
      // Base spacing for sequential events
      let spacing = options.scale;
      
      // Add "a bit" of space for larger gaps
      if (diff > 100) {
        spacing += options.scale * 0.8; 
      } else if (diff > 20) {
        spacing += options.scale * 0.4;
      }
      
      currentPos += spacing;
      yearPositions[year] = currentPos;
    }
  }

  for (const [yearStr, yearNodes] of Object.entries(groupedByYear)) {
    const year = Number(yearStr);
    // Use the calculated sequential position instead of linear time scaling
    const primaryCoord = yearPositions[year] ?? 0;

    yearNodes.forEach((node, index) => {
      // Offset from center for jitter
      const secondaryCoord = (index - (yearNodes.length - 1) / 2) * options.jitter;

      if (options.axis === 'x') {
        positions[node.data.id] = { x: primaryCoord, y: secondaryCoord };
      } else {
        positions[node.data.id] = { x: secondaryCoord, y: primaryCoord };
      }
    });
  }

  return positions;
}
