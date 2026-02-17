export interface ICalendarEngine {
  /**
   * Validates if a partial or full date is valid within the current calendar rules.
   */
  isValid(date: any, config: any): boolean;

  /**
   * Formats a date for display based on campaign settings.
   * e.g. "12th of Hammer, 1240 AF"
   */
  format(date: any, config: any): string;

  /**
   * Gets the list of available months.
   */
  getMonths(config: any): any[];

  /**
   * Calculates the relative position of a date on a linear timeline (for graph engine).
   */
  getTimelineValue(date: any, config: any): number;
}
