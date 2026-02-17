/**
 * Represents a specific point in time in a campaign world.
 */
export interface TemporalMetadata {
  year: number;
  month?: number;
  day?: number;
  label?: string;
}

/**
 * Represents a single month within a campaign calendar.
 */
export interface CalendarMonth {
  id: string;
  name: string;
  days: number;
}

/**
 * Rules for how time is structured in a campaign vault.
 */
export interface CampaignCalendar {
  useGregorian: boolean;
  months: CalendarMonth[];
  daysPerWeek: number;
  epochLabel?: string;
  presentYear?: number;
}
