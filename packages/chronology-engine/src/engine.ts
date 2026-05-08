import type { TemporalMetadata, WorldCalendar, CalendarMonth } from "./types";

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

export const DEFAULT_CALENDAR: WorldCalendar = {
  useGregorian: true,
  months: GREGORIAN_MONTHS,
  daysPerWeek: 7,
};

const daysInYearCache = new WeakMap<WorldCalendar, number>();

export class CalendarEngine {
  /**
   * Get the active month list for a configuration.
   */
  getMonths(config: WorldCalendar): CalendarMonth[] {
    return config.useGregorian ? GREGORIAN_MONTHS : config.months;
  }

  /**
   * Get the total days in a year for the given configuration.
   * Results are cached to avoid redundant reductions in performance-critical loops.
   */
  getDaysInYear(config: WorldCalendar): number {
    if (daysInYearCache.has(config)) {
      return daysInYearCache.get(config)!;
    }
    const total = this.getMonths(config).reduce((acc, m) => acc + m.days, 0);
    daysInYearCache.set(config, total);
    return total;
  }

  /**
   * Validate if a date structure is valid under the given calendar rules.
   */
  isValid(date: TemporalMetadata, config: WorldCalendar): boolean {
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
  format(date: TemporalMetadata, config: WorldCalendar): string {
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
   * Convert a date to a linear numeric value for sorting and positioning.
   * This handles custom month lengths to ensure correct spacing.
   *
   * Note: This uses ISO 8601 style numbering (including Year 0).
   */
  getTimelineValue(date: TemporalMetadata, config: WorldCalendar): number {
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

  /**
   * Parse a string input into a TemporalMetadata structure.
   * Supports:
   * - DDMMYYYY (8 digits)
   * - DD.MM.YYYY
   * - DD/MM/YYYY
   * - DD-MM-YYYY
   * - YYYY
   */
  parse(
    input: string,
    config: CampaignCalendar = DEFAULT_CALENDAR,
  ): TemporalMetadata | null {
    const s = input.trim().toLowerCase();
    if (!s) return null;

    // Check if the whole string starts with a minus (e.g. -12.01.2024)
    let isGlobalNegative = false;
    let normalized = s;
    if (s.startsWith("-") && s.length > 1 && !s.match(/^-\d+$/)) {
      isGlobalNegative = true;
      normalized = s.substring(1);
    }

    // Try DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY (Year can be negative like 12.01.-2024)
    const dmyMatch = normalized.match(
      /^(\d{1,2})[./-](\d{1,2})[./-](-?\d{1,6})$/,
    );
    if (dmyMatch) {
      let year = parseInt(dmyMatch[3], 10);
      if (isGlobalNegative) year = -Math.abs(year);
      return {
        day: parseInt(dmyMatch[1], 10),
        month: parseInt(dmyMatch[2], 10),
        year,
      };
    }

    const months = this.getMonths(config);
    const monthNames = months.map((m) => m.name.toLowerCase());

    // Try DD Month YYYY (e.g. "12 January 1240" or "12 Jan -1240")
    const ddMonthYearMatch = normalized.match(
      /^(\d{1,2})\s+([a-z]+)\s+(-?\d{1,6})$/,
    );
    if (ddMonthYearMatch) {
      const day = parseInt(ddMonthYearMatch[1], 10);
      const monthName = ddMonthYearMatch[2];
      let year = parseInt(ddMonthYearMatch[3], 10);
      if (isGlobalNegative) year = -Math.abs(year);
      const monthIndex = monthNames.findIndex(
        (m) => m.startsWith(monthName) && monthName.length >= 3,
      );
      if (monthIndex !== -1) {
        return { day, month: monthIndex + 1, year };
      }
    }

    // Try "Month DD, YYYY" or "Month DD YYYY"
    const monthDdYearMatch = normalized.match(
      /^([a-z]+)\s+(\d{1,2})[,\s]+(-?\d{1,6})$/,
    );
    if (monthDdYearMatch) {
      const monthName = monthDdYearMatch[1];
      const day = parseInt(monthDdYearMatch[2], 10);
      let year = parseInt(monthDdYearMatch[3], 10);
      if (isGlobalNegative) year = -Math.abs(year);
      const monthIndex = monthNames.findIndex(
        (m) => m.startsWith(monthName) && monthName.length >= 3,
      );
      if (monthIndex !== -1) {
        return { day, month: monthIndex + 1, year };
      }
    }

    // Try DDMMYYYY (exactly 8 digits)
    const ddmmyyyyMatch = normalized.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (ddmmyyyyMatch) {
      let year = parseInt(ddmmyyyyMatch[3], 10);
      if (isGlobalNegative) year = -Math.abs(year);
      return {
        day: parseInt(ddmmyyyyMatch[1], 10),
        month: parseInt(ddmmyyyyMatch[2], 10),
        year,
      };
    }

    // Try YYYY (up to 6 digits, allows negative)
    const yearMatch = normalized.match(/^-?(\d{1,6})$/);
    if (yearMatch) {
      let year = parseInt(yearMatch[0], 10);
      if (isGlobalNegative) year = -Math.abs(year);
      return {
        year,
      };
    }

    return null;
  }
}

export const calendarEngine = new CalendarEngine();
