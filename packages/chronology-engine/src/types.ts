/**
 * Represents a specific point in time in a campaign world (legacy structure).
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
 * Represents an intercalary day or anchor point (e.g. Winter Solstice) in a calendar.
 */
export interface IntercalaryAnchor {
  id: string;
  name: string;
  afterMonthId?: string;
  afterDay?: number;
}

/**
 * Rules for how time is structured in a campaign vault.
 */
export interface WorldCalendar {
  useGregorian: boolean;
  months: CalendarMonth[];
  daysPerWeek: number;
  epochLabel?: string;
  presentYear?: number;
  revision?: number;
  anchors?: IntercalaryAnchor[];
}

export type DatePrecision = "year" | "unit" | "day" | "anchor";

/**
 * Represents a precise date selection made in the picker.
 */
export interface DateSelection {
  precision: DatePrecision;
  year: number;
  unitId?: string;
  day?: number;
  anchorId?: string;
  label?: string;
  calendarRevision: number;
}

/**
 * A snapshot of a calendar configuration at a specific revision.
 */
export interface CalendarSnapshot {
  config: WorldCalendar;
  revision: number;
}

/**
 * Explanation and suggestion when a date is invalid against the current calendar.
 */
export interface RepairState {
  originalSelection: DateSelection;
  suggestedSelection: DateSelection;
  reason: "missing-unit" | "missing-anchor" | "day-overflow" | "stale-revision";
  requiresConfirmation: true;
}

/**
 * Represents a single column wheel state in the picker UI.
 */
export interface WheelColumnState {
  id: "year" | "unit" | "day" | "anchor";
  label: string;
  options: WheelOption[];
  selectedId: string;
  canDirectEnter: boolean;
}

/**
 * Represents an item in a scroll wheel list.
 */
export interface WheelOption {
  id: string;
  label: string;
  value: number | string;
  disabled?: boolean;
}

export interface CalendarExactDate {
  year: number;
  month: number;
  day: number;
}

export interface CalendarEventEntry {
  entityId: string;
  title: string;
  entityType: string;
  dateKind: "exact" | "approximate" | "missing";
  date: TemporalMetadata | null;
  exactDate?: CalendarExactDate;
  displayDateLabel: string;
  sortKey?: number;
  relatedEntityIds: string[];
  labels: string[];
}

export interface CalendarFilterInput {
  entityType?: string | null;
  labelIds?: string[];
  relatedEntityIds?: string[];
}

export interface CalendarDayCell {
  date: CalendarExactDate;
  inCurrentMonth: boolean;
  entries: CalendarEventEntry[];
  overflowCount: number;
  hiddenEntries: CalendarEventEntry[];
}

export interface CalendarMonthWeek {
  days: CalendarDayCell[];
}

export interface CalendarMonthViewModel {
  year: number;
  month: number;
  title: string;
  weeks: CalendarMonthWeek[];
}

export interface AgendaSection {
  id: string;
  label: string;
  entries: CalendarEventEntry[];
}
