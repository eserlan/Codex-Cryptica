import type {
  TemporalMetadata,
  WorldCalendar,
  CalendarMonth,
} from "../../../packages/chronology-engine/src/types";

export interface ICalendarEngine {
  /**
   * Validates if a partial or full date is valid within the current calendar rules.
   */
  isValid(date: TemporalMetadata, config: WorldCalendar): boolean;

  /**
   * Formats a date for display based on campaign settings.
   * e.g. "12th of Hammer, 1240 AF"
   */
  format(date: TemporalMetadata, config: WorldCalendar): string;

  /**
   * Gets the list of available months.
   */
  getMonths(config: WorldCalendar): CalendarMonth[];

  /**
   * Calculates the relative position of a date on a linear timeline (for graph engine).
   */
  getTimelineValue(date: TemporalMetadata, config: WorldCalendar): number;
}
