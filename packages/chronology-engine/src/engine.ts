import type {
  TemporalMetadata,
  CampaignCalendar,
  CalendarMonth,
} from "./types";

export const GREGORIAN_MONTHS: CalendarMonth[] = [
  { id: "january", name: "January", days: 31 },
  { id: "february", name: "February", days: 28 }, // Simplified: no leap year logic yet for custom
  { id: "march", name: "March", days: 31 },
  { id: "april", name: "April", days: 30 },
  { id: "may", name: "May", days: 31 },
  { id: "june", name: "June", days: 30 },
  { id: "july", name: "July", days: 31 },
  { id: "august", name: "August", days: 31 },
  { id: "september", name: "September", days: 30 },
  { id: "october", name: "October", days: 31 },
  { id: "november", name: "November", days: 30 },
  { id: "december", name: "December", days: 31 },
];

export const DEFAULT_CALENDAR: CampaignCalendar = {
  useGregorian: true,
  months: GREGORIAN_MONTHS,
  daysPerWeek: 7,
};

export class CalendarEngine {
  /**
   * Get the active month list for a configuration.
   */
  getMonths(config: CampaignCalendar): CalendarMonth[] {
    return config.useGregorian ? GREGORIAN_MONTHS : config.months;
  }

  /**
   * Validate if a date structure is valid under the given calendar rules.
   */
  isValid(date: TemporalMetadata, config: CampaignCalendar): boolean {
    if (date.year === undefined || date.year === null) return false;

    const months = this.getMonths(config);

    if (date.month !== undefined) {
      if (date.month < 1 || date.month > months.length) return false;

      if (date.day !== undefined) {
        const monthDays = months[date.month - 1].days;
        if (date.day < 1 || date.day > monthDays) return false;
      }
    } else if (date.day !== undefined) {
      // Day without month is invalid
      return false;
    }

    return true;
  }

  /**
   * Format a date for human readability.
   */
  format(date: TemporalMetadata, config: CampaignCalendar): string {
    if (date.label) return date.label;

    const months = this.getMonths(config);
    const parts: string[] = [];

    if (date.day !== undefined && date.month !== undefined) {
      parts.push(`${date.day}`);
    }

    if (date.month !== undefined) {
      const monthName = months[date.month - 1]?.name || `Month ${date.month}`;
      parts.push(monthName);
    }

    let yearStr = `${date.year}`;
    if (config.epochLabel) {
      yearStr += ` ${config.epochLabel}`;
    }
    parts.push(yearStr);

    return parts.join(" ");
  }

  /**
   * Get the total days in a year for the given configuration.
   */
  getDaysInYear(config: CampaignCalendar): number {
    return this.getMonths(config).reduce((acc, m) => acc + m.days, 0);
  }

  /**
   * Convert a date to a linear numeric value for sorting and positioning.
   * This handles custom month lengths to ensure correct spacing.
   */
  getTimelineValue(date: TemporalMetadata, config: CampaignCalendar): number {
    const months = this.getMonths(config);
    const daysInYear = this.getDaysInYear(config);

    let value = date.year * daysInYear;

    if (date.month !== undefined) {
      // Add days from preceding months
      for (let i = 0; i < date.month - 1; i++) {
        value += months[i].days;
      }

      if (date.day !== undefined) {
        value += date.day - 1;
      }
    }

    return value;
  }
}

export const calendarEngine = new CalendarEngine();
