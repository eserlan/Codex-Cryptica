import type { Era } from "schema";
import {
  getPositionForYear,
  TIMELINE_DAY_ZOOM_THRESHOLD,
  TIMELINE_MONTH_ZOOM_THRESHOLD,
} from "../layouts/timeline";

export interface RulerTick {
  year: number;
  pos: number;
  isMajor: boolean;
  label: string;
  type: "year" | "month" | "day";
}

export interface EraRegion {
  id: string;
  name: string;
  startPos: number;
  endPos: number;
  color?: string;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Calculates tick marks for a timeline ruler based on actual data positions and current zoom level.
 */
export function getRulerTicks(
  yearPositions: Record<number, number>,
  zoom: number = 1.0,
): RulerTick[] {
  const ticks: RulerTick[] = [];
  const rawYears = Object.keys(yearPositions)
    .map(Number)
    .sort((a, b) => a - b);
  if (rawYears.length === 0) return [];

  const context = { yearPositions };
  const getPos = (yr: number) => getPositionForYear(yr, context);

  // If zoom is standard, only show year ticks
  if (zoom < TIMELINE_MONTH_ZOOM_THRESHOLD) {
    const entries = Object.entries(yearPositions)
      .map(([yearStr, pos]) => ({
        rawYear: Number(yearStr),
        year: Math.floor(Number(yearStr)),
        pos,
      }))
      .sort((a, b) => a.rawYear - b.rawYear);

    const seenYears = new Set<number>();
    const uniqueEntries: typeof entries = [];
    for (const entry of entries) {
      if (!seenYears.has(entry.year)) {
        seenYears.add(entry.year);
        uniqueEntries.push(entry);
      }
    }

    const maxTicks = 50;
    const step = Math.ceil(uniqueEntries.length / maxTicks);

    for (let i = 0; i < uniqueEntries.length; i += step) {
      const entry = uniqueEntries[i];
      ticks.push({
        year: entry.year,
        pos: entry.pos,
        isMajor: i % 5 === 0,
        label: String(entry.year),
        type: "year",
      });
    }
    return ticks;
  }

  const seenYearTicks = new Set<number>();
  const seenMonthTicks = new Set<string>();
  const seenDayTicks = new Set<string>();

  for (const rawYear of rawYears) {
    const integerYear = Math.floor(rawYear);

    if (!seenYearTicks.has(integerYear)) {
      const yearPos = getPos(integerYear);
      if (yearPos !== null) {
        ticks.push({
          year: integerYear,
          pos: yearPos,
          isMajor: true,
          label: String(integerYear),
          type: "year",
        });
      }
      seenYearTicks.add(integerYear);
    }

    if (Number.isInteger(rawYear)) continue;

    const monthIndex = Math.floor((rawYear - integerYear) * 12);
    const normalizedMonthIndex = Math.max(0, Math.min(11, monthIndex));
    const fractionalMonth = integerYear + normalizedMonthIndex / 12;
    const monthKey = `${integerYear}-${normalizedMonthIndex}`;

    if (!seenMonthTicks.has(monthKey)) {
      const monthPos = getPos(fractionalMonth);
      if (monthPos !== null) {
        const isDayZoom = zoom >= TIMELINE_DAY_ZOOM_THRESHOLD;
        ticks.push({
          year: integerYear,
          pos: monthPos,
          isMajor: isDayZoom,
          label: isDayZoom
            ? `${MONTH_NAMES[normalizedMonthIndex]} ${integerYear}`
            : MONTH_NAMES[normalizedMonthIndex],
          type: "month",
        });
      }
      seenMonthTicks.add(monthKey);
    }

    if (zoom >= TIMELINE_DAY_ZOOM_THRESHOLD) {
      const dayOfYear = Math.floor((rawYear - integerYear) * 365) + 1;
      const dayKey = `${integerYear}-${normalizedMonthIndex}-${dayOfYear}`;
      if (seenDayTicks.has(dayKey)) continue;

      const dayPos = getPos(rawYear);
      if (dayPos !== null) {
        const approximateDayInMonth =
          Math.floor((rawYear - fractionalMonth) * 365) + 1;
        const label = String(Math.max(1, approximateDayInMonth));
        ticks.push({
          year: integerYear,
          pos: dayPos,
          isMajor: false,
          label,
          type: "day",
        });
      }
      seenDayTicks.add(dayKey);
    }
  }

  return ticks;
}

/**
 * Calculates geometric regions for Eras based on sequential positions.
 */
export function getEraRegions(
  eras: Era[],
  yearPositions: Record<number, number>,
): EraRegion[] {
  const years = Object.keys(yearPositions)
    .map(Number)
    .sort((a, b) => a - b);
  if (years.length === 0) return [];

  const lastYear = years[years.length - 1];
  const lastPos = yearPositions[lastYear];

  return eras.map((era) => {
    // Find the closest year in our data for start/end
    const findClosestPos = (targetYear: number) => {
      const closestYear = years.reduce((prev, curr) =>
        Math.abs(curr - targetYear) < Math.abs(prev - targetYear) ? curr : prev,
      );
      return yearPositions[closestYear];
    };

    const startPos = findClosestPos(era.start_year);
    const endPos =
      era.end_year !== undefined ? findClosestPos(era.end_year) : lastPos + 500;

    return {
      id: era.id,
      name: era.name,
      startPos,
      endPos,
      color: era.color,
    };
  });
}
