import type { WorldCalendar } from "chronology-engine";
import {
  clonePreservingPrecision,
  dateToDayInterval,
  getCalendarRevision,
  hasCalendarRevisionMismatch,
  isUnplacedAnchorDate,
} from "./historical-anchor-chronology";
import { clampText, extractEventRawDates } from "./historical-anchor-event";
import {
  HISTORICAL_ANCHOR_FALLBACK_ACTION,
  type AdventureCalendarDate,
  type DayInterval,
  type HistoricalAnchorCompatibilityResult,
  type HistoricalAnchorValidationErrorCode,
  type HistoricalAnchorValidationFailure,
  type HistoricalDateInterval,
  type HistoricalEventSnapshot,
} from "./historical-anchor-types";

function fail(
  code: HistoricalAnchorValidationErrorCode,
  reason: string,
): HistoricalAnchorValidationFailure {
  return {
    ok: false,
    code,
    reason,
    fallbackAction: HISTORICAL_ANCHOR_FALLBACK_ACTION,
  };
}

function intervalsOverlap(a: DayInterval, b: DayInterval): boolean {
  return a.first <= b.last && a.last >= b.first;
}

export interface ValidateHistoricalAnchorCompatibilityInput {
  event: HistoricalEventSnapshot | null | undefined;
  startDate: AdventureCalendarDate | null | undefined;
  calendar: WorldCalendar;
}

export function validateHistoricalAnchorCompatibility(
  input: ValidateHistoricalAnchorCompatibilityInput,
): HistoricalAnchorCompatibilityResult {
  const { event, startDate, calendar } = input;
  const sourceFailure = validateHistoricalAnchorSource(event);
  if (sourceFailure) return sourceFailure;

  // Source validation narrows the event to a valid record.
  const validEvent = event as HistoricalEventSnapshot;
  const { rawStart, rawEnd } = extractEventRawDates(validEvent);
  if (!rawStart) {
    return fail(
      "missing-event-date",
      "The selected Vault event has no date to anchor against.",
    );
  }

  const startDateFailure = validateStartingDate(startDate);
  if (startDateFailure) return startDateFailure;
  const validStartDate = startDate as AdventureCalendarDate;

  const revisionFailure = validateCalendarRevisions(
    validStartDate,
    rawStart,
    rawEnd,
    calendar,
  );
  if (revisionFailure) return revisionFailure;

  const intervals = getCompatibilityIntervals(
    validStartDate,
    rawStart,
    rawEnd,
    calendar,
  );
  if (!intervals.ok) return intervals;
  const { startInterval, eventDayInterval } = intervals;

  if (startInterval.first > eventDayInterval.last) {
    return fail(
      "start-after-event",
      "The chosen starting date falls after the anchored historical event.",
    );
  }

  const ambiguousFailure = validateUnambiguousComparison(
    validEvent,
    validStartDate,
    rawStart,
    rawEnd,
    startInterval,
    eventDayInterval,
    calendar,
  );
  if (ambiguousFailure) return ambiguousFailure;

  const eventInterval: HistoricalDateInterval = {
    start: clonePreservingPrecision(rawStart),
    ...(rawEnd ? { end: clonePreservingPrecision(rawEnd) } : {}),
    ...(validEvent.approximate ? { approximate: true } : {}),
    ...(validEvent.dateLabel ? { label: clampText(validEvent.dateLabel) } : {}),
  };

  return {
    ok: true,
    eventInterval,
    startDate: clonePreservingPrecision(validStartDate),
    calendarRevision: getCalendarRevision(calendar),
  };
}

function validateHistoricalAnchorSource(
  event: HistoricalEventSnapshot | null | undefined,
): HistoricalAnchorValidationFailure | null {
  if (
    event &&
    typeof event === "object" &&
    event.id?.trim() &&
    event.type === "event"
  ) {
    return null;
  }
  return fail(
    "invalid-source-id",
    "Historical anchor requires an existing Vault event record.",
  );
}

function validateStartingDate(
  date: AdventureCalendarDate | null | undefined,
): HistoricalAnchorValidationFailure | null {
  return date && typeof date === "object"
    ? null
    : fail("invalid-date", "A valid starting date is required.");
}

function validateCalendarRevisions(
  startDate: AdventureCalendarDate,
  rawStart: AdventureCalendarDate,
  rawEnd: AdventureCalendarDate | undefined,
  calendar: WorldCalendar,
): HistoricalAnchorValidationFailure | null {
  if (
    hasCalendarRevisionMismatch(startDate, calendar) ||
    hasCalendarRevisionMismatch(rawStart, calendar) ||
    (rawEnd && hasCalendarRevisionMismatch(rawEnd, calendar))
  ) {
    return fail(
      "calendar-mismatch",
      "The starting date or event date uses a stale calendar revision.",
    );
  }
  if (
    startDate.calendarRevision !== undefined &&
    rawStart.calendarRevision !== undefined &&
    startDate.calendarRevision !== rawStart.calendarRevision
  ) {
    return fail(
      "calendar-mismatch",
      "The starting date and event date belong to different calendar revisions.",
    );
  }
  return null;
}

function getCompatibilityIntervals(
  startDate: AdventureCalendarDate,
  rawStart: AdventureCalendarDate,
  rawEnd: AdventureCalendarDate | undefined,
  calendar: WorldCalendar,
):
  | { ok: true; startInterval: DayInterval; eventDayInterval: DayInterval }
  | HistoricalAnchorValidationFailure {
  const startInterval = dateToDayInterval(startDate, calendar);
  if (!startInterval) {
    return fail(
      "invalid-date",
      "The starting date is not valid in the active calendar.",
    );
  }
  const eventStartInterval = dateToDayInterval(rawStart, calendar);
  if (!eventStartInterval) {
    return fail(
      "invalid-date",
      "The event start date is not valid in the active calendar.",
    );
  }
  const eventEndInterval = rawEnd ? dateToDayInterval(rawEnd, calendar) : null;
  if (rawEnd && !eventEndInterval) {
    return fail(
      "invalid-date",
      "The event end date is not valid in the active calendar.",
    );
  }
  if (eventEndInterval && eventStartInterval.first > eventEndInterval.last) {
    return fail(
      "invalid-date-range",
      "The event date range starts after it ends.",
    );
  }
  return {
    ok: true,
    startInterval,
    eventDayInterval: {
      first: eventStartInterval.first,
      last: (eventEndInterval ?? eventStartInterval).last,
    },
  };
}

function validateUnambiguousComparison(
  event: HistoricalEventSnapshot,
  startDate: AdventureCalendarDate,
  rawStart: AdventureCalendarDate,
  rawEnd: AdventureCalendarDate | undefined,
  startInterval: DayInterval,
  eventDayInterval: DayInterval,
  calendar: WorldCalendar,
): HistoricalAnchorValidationFailure | null {
  const overlaps = intervalsOverlap(startInterval, eventDayInterval);
  if (!overlaps) return null;
  const ambiguousBoundary =
    event.approximate ||
    isUnplacedAnchorDate(rawStart, calendar) ||
    (rawEnd !== undefined && isUnplacedAnchorDate(rawEnd, calendar)) ||
    isUnplacedAnchorDate(startDate, calendar);
  return ambiguousBoundary
    ? fail(
        "ambiguous-comparison",
        "The starting date overlaps an approximate or unplaced-anchor event boundary and cannot be ordered unambiguously.",
      )
    : null;
}
