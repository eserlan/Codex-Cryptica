import type {
  EligibilityResult,
  FactionTurnSettings,
  FactionTurnState,
  ResolvedWorldDate,
  WorldDateStamp,
} from "./types";

/**
 * Whether a faction may take a turn yet.
 *
 * The world clock is read here and **never written** (FR-006). The faction
 * system is pull-based on the GM's clock: they advance time when they choose,
 * and on their next visit some factions have quietly become eligible.
 *
 * Nothing in this module throws. Every failure is a state with a plain-language
 * reason, because "you cannot act yet" is a message to a GM, not an error
 * (Constitution IX).
 */

/**
 * The slice of calendar configuration this module needs.
 *
 * Structural rather than an import of `WorldCalendar`, so `faction-engine` stays
 * dependency-light and testable with a two-field literal. The caller passes the
 * real calendar's values.
 */
export interface CalendarShape {
  monthsPerYear: number;
  revision: number;
}

/** Convert a resolved current date into the stamp stored on a turn record. */
export function toWorldDateStamp(
  resolved: ResolvedWorldDate,
  calendarRevision: number,
): WorldDateStamp {
  return {
    year: resolved.date.year,
    month: resolved.date.month,
    day: resolved.date.day,
    calendarRevision,
  };
}

/**
 * Total months since year zero, used only for comparison and interval
 * arithmetic. Day is compared separately so a year-only vault (no `day`) still
 * orders correctly rather than being treated as day zero.
 */
function monthIndex(date: WorldDateStamp, monthsPerYear: number): number {
  return date.year * monthsPerYear + (date.month - 1);
}

function compareDates(
  a: WorldDateStamp,
  b: WorldDateStamp,
  monthsPerYear: number,
): number {
  const byMonth = monthIndex(a, monthsPerYear) - monthIndex(b, monthsPerYear);
  if (byMonth !== 0) return byMonth;
  // A missing day sorts as the start of the month. Two year-only dates in the
  // same month therefore compare equal, which is the intended behaviour: that
  // vault simply cannot express a finer distinction.
  return (a.day ?? 1) - (b.day ?? 1);
}

/**
 * Keeps the month and optional day stored on a faction turn visible, so a
 * monthly or quarterly wait does not collapse into an unhelpful year alone.
 */
function formatWorldDate(date: WorldDateStamp): string {
  const parts = [String(date.year), `month ${date.month}`];
  if (date.day !== undefined) parts.push(`day ${date.day}`);
  return parts.join(", ");
}

/** The earliest date at which a faction that last acted on `from` may act again. */
export function nextEligibleDate(
  from: WorldDateStamp,
  settings: FactionTurnSettings,
  calendar: CalendarShape,
): WorldDateStamp {
  const monthsPerYear = Math.max(1, calendar.monthsPerYear);
  if (settings.turnIntervalUnit === "year") {
    return { ...from, year: from.year + settings.turnIntervalAmount };
  }
  const total = monthIndex(from, monthsPerYear) + settings.turnIntervalAmount;
  return {
    ...from,
    year: Math.floor(total / monthsPerYear),
    month: (total % monthsPerYear) + 1,
  };
}

const NO_WORLD_DATE_REASON =
  "This campaign has no current date set yet. Set one to start running faction turns.";

export function evaluateEligibility(
  factionTurn: FactionTurnState | undefined,
  currentDate: ResolvedWorldDate | null,
  settings: FactionTurnSettings,
  calendar: CalendarShape,
): EligibilityResult {
  // FR-008a. The resolver's last tier falls back to the real-world clock, which
  // is not campaign time. Treating it as such would make every faction eligible
  // forever and stamp turn history with the present-day year — so it is
  // rejected outright, and deliberately not overridable: there is no correct
  // date to record.
  if (!currentDate || currentDate.source === "realWorld") {
    return {
      state: "no-world-date",
      canAct: false,
      canOverride: false,
      reason: NO_WORLD_DATE_REASON,
    };
  }

  const lastTurnDate = factionTurn?.lastTurnDate;
  if (!lastTurnDate) {
    return {
      state: "never-acted",
      canAct: true,
      canOverride: false,
      reason: "This faction has not taken a turn yet.",
    };
  }

  const monthsPerYear = Math.max(1, calendar.monthsPerYear);
  const now = toWorldDateStamp(currentDate, calendar.revision);

  if (compareDates(now, lastTurnDate, monthsPerYear) < 0) {
    // The GM moved their clock backwards past this faction's last turn. Not an
    // error and not something to "repair" (FR-014) — they may be replaying a
    // season deliberately.
    return {
      state: "clock-behind",
      canAct: false,
      canOverride: true,
      lastTurnDate,
      reason:
        "This faction's last turn is later than the campaign's current date.",
    };
  }

  const next = nextEligibleDate(lastTurnDate, settings, calendar);
  if (compareDates(now, next, monthsPerYear) < 0) {
    return {
      state: "too-soon",
      canAct: false,
      canOverride: true,
      lastTurnDate,
      nextEligibleDate: next,
      reason: `This faction acted in ${formatWorldDate(lastTurnDate)} and can act again in ${formatWorldDate(next)}.`,
    };
  }

  return {
    state: "eligible",
    canAct: true,
    canOverride: false,
    lastTurnDate,
    reason: "This faction is ready to act.",
  };
}
