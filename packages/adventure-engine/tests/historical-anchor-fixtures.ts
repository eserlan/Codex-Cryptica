import type { WorldCalendar } from "chronology-engine";
import { validateAndCreateHistoricalAnchor } from "../src/historical-anchor";
import type {
  AdventureCalendarDate,
  HistoricalAnchorPolicy,
  HistoricalEventSnapshot,
} from "../src/historical-anchor-types";
import type { AdventureSession } from "../src/types";
import { now, session } from "./reducer-fixtures";

export const calendar: WorldCalendar = {
  useGregorian: false,
  daysPerWeek: 7,
  revision: 1,
  months: [
    { id: "m1", name: "Frostfall", days: 30 },
    { id: "m2", name: "Sunhigh", days: 30 },
    { id: "m3", name: "Leafwane", days: 30 },
  ],
};

export const startDate: AdventureCalendarDate = {
  year: 620,
  precision: "day",
  unitId: "m1",
  day: 1,
  calendarRevision: 1,
};

export function eventSnapshot(
  overrides: Partial<HistoricalEventSnapshot> = {},
): HistoricalEventSnapshot {
  return {
    id: "evt-king-death",
    type: "event",
    title: "Death of King Aldous",
    content: "The king died in 620.",
    start_date: {
      year: 620,
      precision: "day",
      unitId: "m2",
      day: 15,
      calendarRevision: 1,
    },
    ...overrides,
  };
}

export function anchorSession(
  eventOverrides: Partial<HistoricalEventSnapshot> = {},
  policy: HistoricalAnchorPolicy = "preserve",
): AdventureSession {
  const created = validateAndCreateHistoricalAnchor({
    event: eventSnapshot(eventOverrides),
    startDate,
    calendar,
    policy,
    now,
  });
  if (!created.ok) throw new Error(created.reason);
  return { ...session(), historicalAnchor: created.anchor };
}

export function overBudgetAnchorSession(): AdventureSession {
  const anchored = anchorSession();
  anchored.visibleState.knownFacts = Array.from({ length: 55 }, (_, index) => ({
    id: `fact-${index}`,
    text: "x".repeat(600),
    source: "canonical",
  }));
  anchored.visibleState.objectives = Array.from({ length: 18 }, (_, index) => ({
    id: `obj-${index}`,
    text: "y".repeat(600),
    source: "canonical",
  }));
  anchored.visibleState.activeCharacters = Array.from(
    { length: 12 },
    (_, index) => ({
      id: `char-${index}`,
      text: "z".repeat(600),
      source: "canonical",
    }),
  );
  return anchored;
}
