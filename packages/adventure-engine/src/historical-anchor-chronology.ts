import {
  calendarEngine,
  formatEraYear,
  resolveEraForYear,
  type DateSelection,
  type ResolvedEra,
  type TemporalMetadata,
  type WorldCalendar,
} from "chronology-engine";
import type {
  AdventureCalendarDate,
  DayInterval,
  HistoricalDateInterval,
} from "./historical-anchor-types";

const MAX_PROJECTED_ELAPSED_MINUTES = 52_560_000;
const MINUTES_PER_DAY = 1_440;

export function getCalendarRevision(calendar: WorldCalendar): number {
  return calendar.revision && calendar.revision > 0 ? calendar.revision : 1;
}

export function hasCalendarRevisionMismatch(
  date: AdventureCalendarDate,
  calendar: WorldCalendar,
): boolean {
  return (
    date.calendarRevision !== undefined &&
    date.calendarRevision !== getCalendarRevision(calendar)
  );
}

/**
 * Clones a calendar date while preserving only the fields actually present.
 * Never invents missing `month`, `day`, `unitId`, or `anchorId`.
 */
export function clonePreservingPrecision(
  date: AdventureCalendarDate,
): AdventureCalendarDate {
  return {
    year: date.year,
    ...(date.month !== undefined ? { month: date.month } : {}),
    ...(date.day !== undefined ? { day: date.day } : {}),
    ...(date.precision !== undefined ? { precision: date.precision } : {}),
    ...(date.unitId !== undefined ? { unitId: date.unitId } : {}),
    ...(date.anchorId !== undefined ? { anchorId: date.anchorId } : {}),
    ...(date.calendarRevision !== undefined
      ? { calendarRevision: date.calendarRevision }
      : {}),
    ...(date.label !== undefined ? { label: date.label } : {}),
  };
}

export function isUnplacedAnchorDate(
  date: AdventureCalendarDate,
  calendar: WorldCalendar,
): boolean {
  if (date.precision !== "anchor" || !date.anchorId) return false;
  const anchor = (calendar.anchors ?? []).find(
    (item) => item.id === date.anchorId,
  );
  return anchor !== undefined && !anchor.afterMonthId;
}

function yearEnd(year: number, calendar: WorldCalendar): number {
  return (year + 1) * calendarEngine.getDaysInYear(calendar) - 1;
}

function asEngineDate(
  date: AdventureCalendarDate,
): DateSelection | TemporalMetadata {
  if (date.precision) {
    return date as DateSelection;
  }
  return date as TemporalMetadata;
}

/**
 * Converts an `AdventureCalendarDate` into a monotonic `[first, last]` day
 * interval using `calendarEngine` without fabricating missing precision.
 */
export function dateToDayInterval(
  date: AdventureCalendarDate,
  calendar: WorldCalendar,
): DayInterval | null {
  if (hasCalendarRevisionMismatch(date, calendar)) return null;
  const engineDate = asEngineDate(date);
  if (!calendarEngine.isValid(engineDate, calendar)) return null;

  const first = calendarEngine.getTimelineValue(engineDate, calendar);
  if (date.precision) {
    switch (date.precision) {
      case "day":
        return { first, last: first };
      case "unit": {
        const month = calendarEngine
          .getMonths(calendar)
          .find((item) => item.id === date.unitId);
        return { first, last: first + (month?.days ?? 1) - 1 };
      }
      case "anchor": {
        const anchor = (calendar.anchors ?? []).find(
          (item) => item.id === date.anchorId,
        );
        if (anchor?.afterMonthId) return { first, last: first };
        return {
          first: date.year * calendarEngine.getDaysInYear(calendar),
          last: yearEnd(date.year, calendar),
        };
      }
      default:
        return { first, last: yearEnd(date.year, calendar) };
    }
  }

  if (date.month === undefined) {
    return { first, last: yearEnd(date.year, calendar) };
  }
  if (date.day !== undefined) {
    return { first, last: first };
  }
  const month = calendarEngine.getMonths(calendar)[date.month - 1];
  return { first, last: first + (month?.days ?? 1) - 1 };
}

/**
 * Converts a `HistoricalDateInterval` into a monotonic `[first, last]` day
 * interval, returning `null` if either bound is invalid or `start > end`.
 */
export function intervalToDayInterval(
  interval: HistoricalDateInterval,
  calendar: WorldCalendar,
): DayInterval | null {
  const start = dateToDayInterval(interval.start, calendar);
  if (!start) return null;
  if (!interval.end) return start;
  const end = dateToDayInterval(interval.end, calendar);
  if (!end) return null;
  if (start.first > end.last) return null;
  return { first: start.first, last: end.last };
}

/**
 * Projects fictional elapsed minutes onto a starting date without inventing
 * missing calendar precision.
 */
export function projectElapsedDayInterval(
  startDate: AdventureCalendarDate,
  calendar: WorldCalendar,
  elapsedMinutes = 0,
): DayInterval | null {
  if (
    !Number.isSafeInteger(elapsedMinutes) ||
    elapsedMinutes < 0 ||
    elapsedMinutes > MAX_PROJECTED_ELAPSED_MINUTES
  ) {
    return null;
  }
  const start = dateToDayInterval(startDate, calendar);
  if (!start) return null;
  const wholeDays = Math.floor(elapsedMinutes / MINUTES_PER_DAY);
  const partialDay = elapsedMinutes % MINUTES_PER_DAY === 0 ? 0 : 1;
  return {
    first: start.first + wholeDays,
    last: start.last + wholeDays + partialDay,
  };
}

export function resolveHistoricalAnchorEraContext(
  date: AdventureCalendarDate,
  calendar: WorldCalendar,
): ResolvedEra | null {
  return resolveEraForYear(date.year, calendar);
}

export function formatAdventureDateWithEra(
  date: AdventureCalendarDate,
  calendar: WorldCalendar,
): string {
  const eraFormatted = formatEraYear(date.year, calendar);
  const yearLabel = eraFormatted ?? `Year ${date.year}`;
  if (date.precision === "anchor" && date.anchorId) {
    const anchor = (calendar.anchors ?? []).find(
      (item) => item.id === date.anchorId,
    );
    return anchor ? `${anchor.name}, ${yearLabel}` : yearLabel;
  }
  if (date.precision === "unit" || date.precision === "day") {
    const month = calendarEngine
      .getMonths(calendar)
      .find((item) => item.id === date.unitId);
    if (month && date.precision === "day" && date.day !== undefined) {
      return `${date.day} ${month.name}, ${yearLabel}`;
    }
    if (month) {
      return `${month.name}, ${yearLabel}`;
    }
  }
  if (date.month !== undefined) {
    const month = calendarEngine.getMonths(calendar)[date.month - 1];
    if (month && date.day !== undefined) {
      return `${date.day} ${month.name}, ${yearLabel}`;
    }
    if (month) {
      return `${month.name}, ${yearLabel}`;
    }
  }
  return yearLabel;
}
