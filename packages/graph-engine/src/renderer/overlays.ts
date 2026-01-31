import type { Era } from "schema";

export interface RulerTick {
  year: number;
  pos: number;
  isMajor: boolean;
}

export interface EraRegion {
  id: string;
  name: string;
  startPos: number;
  endPos: number;
  color?: string;
}

/**
 * Calculates tick marks for a timeline ruler based on actual data positions.
 */
export function getRulerTicks(yearPositions: Record<number, number>): RulerTick[] {
  const ticks: RulerTick[] = [];
  const years = Object.keys(yearPositions).map(Number).sort((a, b) => a - b);
  
  if (years.length === 0) return [];

  // Determine which years to show as ticks to avoid clutter
  // For now, let's show all years if there aren't too many, or filter them
  const maxTicks = 50;
  const step = Math.ceil(years.length / maxTicks);

  for (let i = 0; i < years.length; i += step) {
    const year = years[i];
    ticks.push({
      year,
      pos: yearPositions[year],
      isMajor: i % 5 === 0
    });
  }

  return ticks;
}

/**
 * Calculates geometric regions for Eras based on sequential positions.
 */
export function getEraRegions(eras: Era[], yearPositions: Record<number, number>): EraRegion[] {
  const years = Object.keys(yearPositions).map(Number).sort((a, b) => a - b);
  if (years.length === 0) return [];
  
  const lastYear = years[years.length - 1];
  const lastPos = yearPositions[lastYear];

  return eras.map(era => {
    // Find the closest year in our data for start/end
    const findClosestPos = (targetYear: number) => {
      const closestYear = years.reduce((prev, curr) => 
        Math.abs(curr - targetYear) < Math.abs(prev - targetYear) ? curr : prev
      );
      return yearPositions[closestYear];
    };

    const startPos = findClosestPos(era.start_year);
    const endPos = era.end_year !== undefined ? findClosestPos(era.end_year) : lastPos + 500;

    return {
      id: era.id,
      name: era.name,
      startPos,
      endPos,
      color: era.color
    };
  });
}