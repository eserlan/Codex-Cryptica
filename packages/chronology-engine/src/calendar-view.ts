import { calendarEngine } from "./engine";
import type {
  AgendaSection,
  CalendarDayCell,
  CalendarEventEntry,
  CalendarFilterInput,
  CalendarMonthViewModel,
  WorldCalendar,
} from "./types";

const DEFAULT_MAX_VISIBLE_PER_DAY = 3;

function normalizeValues(values?: string[]): string[] {
  return (values ?? [])
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function compareEntries(a: CalendarEventEntry, b: CalendarEventEntry): number {
  const sortDelta =
    (a.sortKey ?? Number.MAX_SAFE_INTEGER) -
    (b.sortKey ?? Number.MAX_SAFE_INTEGER);
  if (sortDelta !== 0) return sortDelta;

  const titleDelta = a.title.localeCompare(b.title, undefined, {
    sensitivity: "base",
  });
  if (titleDelta !== 0) return titleDelta;

  return a.entityId.localeCompare(b.entityId, undefined, {
    sensitivity: "base",
  });
}

function createDayCell(
  year: number,
  month: number,
  day: number,
  inCurrentMonth: boolean,
  allEntries: CalendarEventEntry[],
  maxVisiblePerDay: number,
): CalendarDayCell {
  return {
    date: { year, month, day },
    inCurrentMonth,
    entries: allEntries.slice(0, maxVisiblePerDay),
    overflowCount: Math.max(0, allEntries.length - maxVisiblePerDay),
    hiddenEntries: allEntries.slice(maxVisiblePerDay),
  };
}

export function filterCalendarEntries(
  entries: CalendarEventEntry[],
  filters: CalendarFilterInput,
): CalendarEventEntry[] {
  const entityType = filters.entityType?.trim().toLowerCase() || null;
  const labelIds = normalizeValues(filters.labelIds);
  const relatedEntityIds = normalizeValues(filters.relatedEntityIds);

  return entries.filter((entry) => {
    if (entityType && entry.entityType.trim().toLowerCase() !== entityType) {
      return false;
    }

    const entryLabels = normalizeValues(entry.labels);
    if (labelIds.some((label) => !entryLabels.includes(label))) {
      return false;
    }

    const entryRelatedIds = normalizeValues(entry.relatedEntityIds);
    if (
      relatedEntityIds.some(
        (relatedEntityId) => !entryRelatedIds.includes(relatedEntityId),
      )
    ) {
      return false;
    }

    return true;
  });
}

export function buildCalendarMonth(
  entries: CalendarEventEntry[],
  year: number,
  month: number,
  config: WorldCalendar,
  maxVisiblePerDay = DEFAULT_MAX_VISIBLE_PER_DAY,
): CalendarMonthViewModel {
  const months = calendarEngine.getMonths(config);
  const daysPerWeek = config.daysPerWeek;
  const monthName = months[month - 1]?.name ?? `Month ${month}`;
  const daysInMonth = months[month - 1]?.days ?? 30;
  const prevMonthIndex = month === 1 ? months.length - 1 : month - 2;
  const daysInPreviousMonth = months[prevMonthIndex]?.days ?? 30;
  const firstWeekday =
    calendarEngine.getTimelineValue({ year, month, day: 1 }, config) %
    daysPerWeek;

  const exactEntries = entries
    .filter((entry) => {
      const exactDate = entry.exactDate;
      return (
        entry.dateKind === "exact" &&
        exactDate?.year === year &&
        exactDate.month === month
      );
    })
    .sort(compareEntries);

  const entryMap = new Map<number, CalendarEventEntry[]>();
  for (const entry of exactEntries) {
    const day = entry.exactDate!.day;
    const existing = entryMap.get(day);
    if (existing) {
      existing.push(entry);
    } else {
      entryMap.set(day, [entry]);
    }
  }

  const cells: CalendarDayCell[] = [];

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? months.length : month - 1;
  const nextYear = month === months.length ? year + 1 : year;
  const nextMonth = month === months.length ? 1 : month + 1;

  for (let i = 0; i < firstWeekday; i++) {
    const day = daysInPreviousMonth - firstWeekday + i + 1;
    cells.push(
      createDayCell(prevYear, prevMonth, day, false, [], maxVisiblePerDay),
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(
      createDayCell(
        year,
        month,
        day,
        true,
        entryMap.get(day) ?? [],
        maxVisiblePerDay,
      ),
    );
  }

  while (cells.length % daysPerWeek !== 0) {
    const day = cells.length - (firstWeekday + daysInMonth) + 1;
    cells.push(
      createDayCell(nextYear, nextMonth, day, false, [], maxVisiblePerDay),
    );
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += daysPerWeek) {
    weeks.push({ days: cells.slice(i, i + daysPerWeek) });
  }

  return {
    year,
    month,
    title: `${monthName} ${year}`,
    weeks,
  };
}

export function buildAgendaSections(
  entries: CalendarEventEntry[],
  config: WorldCalendar,
): AgendaSection[] {
  const months = calendarEngine.getMonths(config);
  const exactSections = new Map<string, AgendaSection>();
  const uncertainEntries: CalendarEventEntry[] = [];

  const sortedEntries = [...entries].sort(compareEntries);

  for (const entry of sortedEntries) {
    if (entry.dateKind === "exact" && entry.exactDate) {
      const { year, month, day } = entry.exactDate;
      const sectionId = `${year}-${month}-${day}`;
      const monthName = months[month - 1]?.name ?? `Month ${month}`;
      const label = `${monthName} ${day}, ${year}`;
      const section = exactSections.get(sectionId);
      if (section) {
        section.entries.push(entry);
      } else {
        exactSections.set(sectionId, {
          id: sectionId,
          label,
          entries: [entry],
        });
      }
      continue;
    }

    uncertainEntries.push(entry);
  }

  const sections = [...exactSections.values()];
  if (uncertainEntries.length > 0) {
    sections.push({
      id: "undated-approximate",
      label: "Undated/Approximate",
      entries: uncertainEntries,
    });
  }

  return sections;
}
