import { GREGORIAN_MONTHS } from "./engine";
import type {
  AgendaSection,
  CalendarDayCell,
  CalendarEventEntry,
  CalendarFilterInput,
  CalendarMonthViewModel,
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
  maxVisiblePerDay = DEFAULT_MAX_VISIBLE_PER_DAY,
): CalendarMonthViewModel {
  const monthName = GREGORIAN_MONTHS[month - 1]?.name ?? `Month ${month}`;
  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPreviousMonth = new Date(year, month - 1, 0).getDate();

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

  for (let i = 0; i < firstWeekday; i++) {
    const day = daysInPreviousMonth - firstWeekday + i + 1;
    const previousMonthDate = new Date(year, month - 2, day);
    cells.push(
      createDayCell(
        previousMonthDate.getFullYear(),
        previousMonthDate.getMonth() + 1,
        day,
        false,
        [],
        maxVisiblePerDay,
      ),
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

  while (cells.length % 7 !== 0) {
    const nextMonthDate = new Date(year, month - 1, daysInMonth + 1);
    const day = cells.length - (firstWeekday + daysInMonth) + 1;
    cells.push(
      createDayCell(
        nextMonthDate.getFullYear(),
        nextMonthDate.getMonth() + 1,
        day,
        false,
        [],
        maxVisiblePerDay,
      ),
    );
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push({ days: cells.slice(i, i + 7) });
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
): AgendaSection[] {
  const exactSections = new Map<string, AgendaSection>();
  const uncertainEntries: CalendarEventEntry[] = [];

  const sortedEntries = [...entries].sort(compareEntries);

  for (const entry of sortedEntries) {
    if (entry.dateKind === "exact" && entry.exactDate) {
      const { year, month, day } = entry.exactDate;
      const sectionId = `${year}-${month}-${day}`;
      const monthName = GREGORIAN_MONTHS[month - 1]?.name ?? `Month ${month}`;
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
