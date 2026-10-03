import type {
  CalendarEra,
  ResolvedEra,
  WorldCalendar,
} from "../../../packages/chronology-engine/src/types";

export type { CalendarEra, ResolvedEra };

/**
 * Core era utility contract in chronology-engine.
 */
export interface CalendarEraService {
  /**
   * Resolve which era applies to an internal chronology year.
   */
  resolveEraForYear(year: number, config: WorldCalendar): ResolvedEra | null;

  /**
   * Convert an era-relative year back to an internal chronology year.
   */
  resolveYearFromEra(era: CalendarEra, eraYear: number): number;

  /**
   * Parse a date string that may contain an era label or name.
   */
  parseEraDateString(
    input: string,
    config: WorldCalendar,
  ): { internalYear: number; day?: number; month?: number } | null;

  /**
   * Format an internal year into an era-qualified string (e.g. "312 BF" or "101 First Age").
   */
  formatEraYear(year: number, config: WorldCalendar): string | null;
}
