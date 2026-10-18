import type { CalendarEra, ResolvedEra, WorldCalendar } from "./types";

/**
 * Resolves which era applies to an internal chronology year, along with the era-relative year.
 */
function resolveBackwardEra(
  eras: CalendarEra[],
  year: number,
): ResolvedEra | null {
  for (let i = 0; i < eras.length; i++) {
    const era = eras[i];
    const nextLowerEra = eras[i + 1];
    const minBound =
      era.endYear !== undefined
        ? era.endYear
        : nextLowerEra
          ? nextLowerEra.startYear + 1
          : -Infinity;

    if (year <= era.startYear && year >= minBound) {
      const yearAtStart = era.yearAtStart ?? 1;
      const eraYear = yearAtStart + (era.startYear - year);
      const suffix = era.label ? ` ${era.label}` : ` ${era.name}`;
      return { era, eraYear, formattedYear: `${eraYear}${suffix}` };
    }
  }
  return null;
}

function resolveForwardEra(
  eras: CalendarEra[],
  year: number,
): ResolvedEra | null {
  for (let i = 0; i < eras.length; i++) {
    const era = eras[i];
    const nextHigherEra = eras[i + 1];
    const maxBound =
      era.endYear !== undefined
        ? era.endYear
        : nextHigherEra
          ? nextHigherEra.startYear - 1
          : Infinity;

    if (year >= era.startYear && year <= maxBound) {
      const yearAtStart = era.yearAtStart ?? 1;
      const eraYear = yearAtStart + (year - era.startYear);
      const suffix = era.label ? ` ${era.label}` : ` ${era.name}`;
      return { era, eraYear, formattedYear: `${eraYear}${suffix}` };
    }
  }
  return null;
}

/**
 * Resolves which era applies to an internal chronology year, along with the era-relative year.
 */
export function resolveEraForYear(
  year: number,
  config: WorldCalendar,
): ResolvedEra | null {
  const eras = config.eras;
  if (!eras || eras.length === 0) {
    return null;
  }

  const backwardEras = eras
    .filter((e) => e.direction === "backward")
    .sort((a, b) => b.startYear - a.startYear);

  const backwardMatch = resolveBackwardEra(backwardEras, year);
  if (backwardMatch) return backwardMatch;

  const forwardEras = eras
    .filter((e) => e.direction !== "backward")
    .sort((a, b) => a.startYear - b.startYear);

  return resolveForwardEra(forwardEras, year);
}

/**
 * Invert an era and its displayed year back into the absolute internal chronology year.
 */
export function resolveYearFromEra(era: CalendarEra, eraYear: number): number {
  const yearAtStart = era.yearAtStart ?? 1;
  if (era.direction === "backward") {
    return era.startYear - (eraYear - yearAtStart);
  }
  return era.startYear + (eraYear - yearAtStart);
}

/**
 * Format an internal year as an era string (e.g. "1 AF" or "311 BF").
 * Returns null if no era matches.
 */
export function formatEraYear(
  year: number,
  config: WorldCalendar,
): string | null {
  const resolved = resolveEraForYear(year, config);
  return resolved ? resolved.formattedYear : null;
}

function parseDateTokens(
  remainder: string,
  era: CalendarEra,
): { internalYear: number; day?: number; month?: number } | null {
  // 1. Full date match: DD/MM/YYYY, DD-MM-YYYY, or DD MM YYYY
  const fullMatch =
    remainder.match(/^(\d{1,2})[./\s](\d{1,2})[./\s](\d+)$/) ||
    remainder.match(/^(\d{1,2})-(\d{1,2})-(\d+)$/);

  if (fullMatch) {
    const day = parseInt(fullMatch[1], 10);
    const month = parseInt(fullMatch[2], 10);
    const eraYear = parseInt(fullMatch[3], 10);
    if (
      Number.isInteger(day) &&
      Number.isInteger(month) &&
      Number.isInteger(eraYear)
    ) {
      return {
        internalYear: resolveYearFromEra(era, eraYear),
        day,
        month,
      };
    }
  }

  // 2. Year-only match: e.g. "312"
  const yearMatch = remainder.match(/^(\d+)$/);
  if (yearMatch) {
    const eraYear = parseInt(yearMatch[1], 10);
    if (Number.isInteger(eraYear)) {
      return { internalYear: resolveYearFromEra(era, eraYear) };
    }
  }

  return null;
}

function matchEraInString(trimmed: string, era: CalendarEra): string | null {
  const candidates: string[] = [];
  if (era.label) candidates.push(era.label);
  candidates.push(era.name);

  for (const cand of candidates) {
    const escaped = cand.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const candRegex = new RegExp(`(^|\\s)${escaped}(\\s|$)`, "i");
    if (candRegex.test(trimmed)) {
      return trimmed.replace(candRegex, " ").trim();
    }
  }
  return null;
}

/**
 * Parses a date input string that contains an era reference (name or label).
 * Returns internalYear along with optional month and day.
 */
export function parseEraDateString(
  input: string,
  config: WorldCalendar,
): { internalYear: number; day?: number; month?: number } | null {
  const eras = config.eras;
  if (!eras || eras.length === 0) return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const sortedEras = [...eras].sort((a, b) => {
    const lenA = Math.max(a.name.length, a.label?.length || 0);
    const lenB = Math.max(b.name.length, b.label?.length || 0);
    return lenB - lenA;
  });

  for (const era of sortedEras) {
    const remainder = matchEraInString(trimmed, era);
    if (remainder !== null) {
      const result = parseDateTokens(remainder, era);
      if (result) return result;
    }
  }

  return null;
}
