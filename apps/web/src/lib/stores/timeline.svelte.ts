import {
  buildAgendaSections,
  buildCalendarMonth,
  calendarEngine,
  resolveCalendarCurrentDate,
  type AgendaSection,
  type CalendarEventEntry,
  type CalendarExactDate,
  type CalendarMonthViewModel,
  type DateSelection,
  type TemporalMetadata,
  type WorldCalendar,
} from "chronology-engine";
import type { Entity, Era } from "schema";
import { graph } from "./graph.svelte";
import { vault, type VaultStore } from "./vault.svelte";
import { calendarStore, type CalendarStore } from "./calendar.svelte";

export interface TimelineEntry {
  entityId: string;
  title: string;
  type: string;
  date: TemporalMetadata;
  eraId?: string;
}

export type TimelineViewMode =
  | "calendar"
  | "agenda"
  | "vertical"
  | "horizontal";

interface TimelineStoreDependencies {
  vault: Pick<
    VaultStore,
    "allEntities" | "entities" | "activeVaultId" | "status"
  >;
  graph: Pick<typeof graph, "eras">;
  calendarStore: Pick<CalendarStore, "config" | "calendarCurrentDate">;
}

function isLegacyDate(
  date: TemporalMetadata | null | undefined,
): date is Extract<
  TemporalMetadata,
  { year: number; month?: number; day?: number }
> {
  return !!date && !("precision" in date);
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

function resolveExactDate(
  date: TemporalMetadata | null | undefined,
  config: WorldCalendar,
): CalendarExactDate | undefined {
  if (!date) return undefined;

  if (isLegacyDate(date)) {
    if (
      typeof date.year === "number" &&
      typeof date.month === "number" &&
      typeof date.day === "number"
    ) {
      return { year: date.year, month: date.month, day: date.day };
    }
    return undefined;
  }

  const selection = date as DateSelection;
  if (
    selection.precision !== "day" ||
    !selection.unitId ||
    typeof selection.day !== "number"
  ) {
    return undefined;
  }

  const months = calendarEngine.getMonths(config);
  const monthIndex = months.findIndex((month) => month.id === selection.unitId);
  if (monthIndex < 0) return undefined;

  return {
    year: selection.year,
    month: monthIndex + 1,
    day: selection.day,
  };
}

function getDateKind(
  date: TemporalMetadata | null | undefined,
  exactDate?: CalendarExactDate,
): CalendarEventEntry["dateKind"] {
  if (!date) return "missing";
  return exactDate ? "exact" : "approximate";
}

function buildDisplayDateLabel(
  date: TemporalMetadata | null | undefined,
  config: WorldCalendar,
  dateKind: CalendarEventEntry["dateKind"],
): string {
  if (!date) return "Undated";
  if (dateKind === "missing") return "Undated";

  try {
    return calendarEngine.format(date, config);
  } catch {
    if (isLegacyDate(date) && date.label) return date.label;
    return "Approximate date";
  }
}

function toCalendarEntry(
  entity: Entity,
  date: TemporalMetadata | undefined,
  config: WorldCalendar,
  title = entity.title,
): CalendarEventEntry | null {
  if (!date) return null;

  const exactDate = resolveExactDate(date, config);
  const dateKind = getDateKind(date, exactDate);
  const sortKey = calendarEngine.isValid(date, config)
    ? calendarEngine.getTimelineValue(date, config)
    : undefined;

  return {
    entityId: entity.id,
    title,
    entityType: entity.type,
    dateKind,
    date,
    exactDate,
    displayDateLabel: buildDisplayDateLabel(date, config, dateKind),
    sortKey,
    relatedEntityIds: (entity.connections ?? []).map(
      (connection) => connection.target,
    ),
    labels: entity.labels ?? [],
  };
}

export class TimelineStore {
  includeUndated = $state(false);
  viewMode = $state<TimelineViewMode>("calendar");
  activeYear = $state(new Date().getFullYear());
  activeMonth = $state(new Date().getMonth() + 1);
  filterType = $state<string | null>(null);
  selectedLabel = $state<string | null>(null);
  selectedRelatedEntityId = $state<string | null>(null);
  maxVisiblePerDay = $state(3);
  /** FR-013: filter bar is collapsed by default on mobile. */
  filterBarCollapsed = $state(true);

  constructor(
    private readonly deps: TimelineStoreDependencies = {
      vault,
      graph,
      calendarStore,
    },
  ) {}

  entries = $derived.by(() => {
    const config = this.deps.calendarStore.config;
    const calendarEntries: TimelineEntry[] = [];

    for (const entity of this.deps.vault.allEntities) {
      const variants: Array<{ date?: TemporalMetadata; title: string }> = [];
      if (entity.date) {
        variants.push({ date: entity.date, title: entity.title });
      } else if (entity.start_date) {
        variants.push({ date: entity.start_date, title: entity.title });
      } else if (entity.end_date) {
        variants.push({ date: entity.end_date, title: entity.title });
      }

      for (const variant of variants) {
        if (!variant.date) continue;
        const exactDate = resolveExactDate(variant.date, config);
        const timelineDate = exactDate ?? (variant.date as TemporalMetadata);

        calendarEntries.push({
          entityId: entity.id,
          title: variant.title,
          type: entity.type,
          date: timelineDate,
          eraId: this.getEraForYear(variant.date.year)?.id,
        });
      }
    }

    return calendarEntries.sort((a, b) => {
      const aSort = calendarEngine.isValid(a.date, config)
        ? calendarEngine.getTimelineValue(a.date, config)
        : Number.MAX_SAFE_INTEGER;
      const bSort = calendarEngine.isValid(b.date, config)
        ? calendarEngine.getTimelineValue(b.date, config)
        : Number.MAX_SAFE_INTEGER;
      if (aSort !== bSort) return aSort - bSort;
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
  });

  calendarEntries = $derived.by(() => {
    const config = this.deps.calendarStore.config;
    const entries: CalendarEventEntry[] = [];

    for (const entity of this.deps.vault.allEntities) {
      const primaryDate =
        entity.date ?? entity.start_date ?? entity.end_date ?? undefined;
      const entityEntries = [
        toCalendarEntry(entity, primaryDate, config),
      ].filter((entry): entry is CalendarEventEntry => entry !== null);

      for (const entry of entityEntries) {
        entries.push(entry);
      }

      if (
        this.includeUndated &&
        !entity.date &&
        !entity.start_date &&
        !entity.end_date
      ) {
        entries.push({
          entityId: entity.id,
          title: entity.title,
          entityType: entity.type,
          dateKind: "missing",
          date: null,
          displayDateLabel: "Undated",
          relatedEntityIds: (entity.connections ?? []).map(
            (connection) => connection.target,
          ),
          labels: entity.labels ?? [],
        });
      }
    }

    return entries.sort((a, b) => {
      const aSort = a.sortKey ?? Number.MAX_SAFE_INTEGER;
      const bSort = b.sortKey ?? Number.MAX_SAFE_INTEGER;
      if (aSort !== bSort) return aSort - bSort;
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    });
  });

  availableLabels = $derived.by(() => {
    const labels = new Set<string>();
    for (const entry of this.calendarEntries) {
      for (const label of entry.labels ?? []) labels.add(label);
    }
    return [...labels].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  });

  availableRelatedEntities = $derived.by(() => {
    const items = new Map<
      string,
      { id: string; title: string; type: string }
    >();
    for (const entry of this.calendarEntries) {
      for (const relatedEntityId of entry.relatedEntityIds) {
        const entity = this.deps.vault.entities[relatedEntityId];
        if (!entity) continue;
        items.set(relatedEntityId, {
          id: relatedEntityId,
          title: entity.title,
          type: entity.type,
        });
      }
    }
    return [...items.values()].sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    );
  });

  filteredCalendarEntries = $derived.by(() => {
    const labelFilter = this.selectedLabel
      ? [normalizeLabel(this.selectedLabel)]
      : [];

    return this.calendarEntries.filter((entry) => {
      if (this.filterType && entry.entityType !== this.filterType) return false;

      if (
        labelFilter.length > 0 &&
        !labelFilter.every((label) =>
          entry.labels.some(
            (entryLabel) => normalizeLabel(entryLabel) === label,
          ),
        )
      ) {
        return false;
      }

      if (
        this.selectedRelatedEntityId &&
        !entry.relatedEntityIds.includes(this.selectedRelatedEntityId)
      ) {
        return false;
      }

      return true;
    });
  });

  filteredEntries = $derived.by(() =>
    this.filteredCalendarEntries
      .filter((entry) => entry.date !== null)
      .map((entry) => ({
        entityId: entry.entityId,
        title: entry.title,
        type: entry.entityType,
        date: entry.exactDate ?? (entry.date as TemporalMetadata),
        eraId: this.getEraForYear(entry.date?.year ?? 0)?.id,
        _sortKey: entry.sortKey ?? Number.MAX_SAFE_INTEGER,
      }))
      .sort((a, b) => {
        if (a._sortKey !== b._sortKey) return a._sortKey - b._sortKey;
        return a.title.localeCompare(b.title, undefined, {
          sensitivity: "base",
        });
      })
      .map(({ _sortKey: _sk, ...rest }) => rest),
  );

  calendarMonthView = $derived.by(
    (): CalendarMonthViewModel =>
      buildCalendarMonth(
        this.filteredCalendarEntries,
        this.activeYear,
        this.activeMonth,
        this.deps.calendarStore.config,
        this.maxVisiblePerDay,
      ),
  );

  agendaSections = $derived.by((): AgendaSection[] =>
    buildAgendaSections(
      this.filteredCalendarEntries,
      this.deps.calendarStore.config,
    ),
  );

  isLoading = $derived.by(
    () =>
      this.deps.vault.status === "loading" ||
      this.deps.vault.status === "saving",
  );

  #initializedForVault = "";

  async init() {
    const currentVaultId = this.deps.vault.activeVaultId ?? "";
    if (this.#initializedForVault === currentVaultId && currentVaultId !== "")
      return;

    // Build the minimal entity shape required by the pure FR-012 resolver
    const entities = this.deps.vault.allEntities.map((e) => {
      const primaryDate = e.date ?? e.start_date ?? e.end_date ?? undefined;
      const exactDate = primaryDate
        ? (resolveExactDate(primaryDate, this.deps.calendarStore.config) ??
          undefined)
        : undefined;
      return {
        id: e.id,
        title: e.title,
        exactDate,
        dateKind: exactDate ? "exact" : primaryDate ? "approximate" : "missing",
        createdAt: (e as Record<string, unknown>).createdAt as
          | string
          | undefined,
      };
    });

    const settings = {
      currentYear: this.deps.calendarStore.config.presentYear ?? null,
    };

    const resolved = resolveCalendarCurrentDate(entities, settings);

    // Persist the result on the calendar store so other surfaces share it
    this.deps.calendarStore.calendarCurrentDate = resolved;

    this.activeYear = resolved.date.year;
    this.activeMonth = resolved.date.month;
    this.#initializedForVault = currentVaultId;
  }

  private getEraForYear(year: number): Era | undefined {
    return this.deps.graph.eras.find((era) => {
      const starts = year >= era.start_year;
      const ends = era.end_year === undefined || year <= era.end_year;
      return starts && ends;
    });
  }

  setViewMode(mode: TimelineViewMode) {
    this.viewMode = mode;
  }

  nextMonth() {
    const monthCount = calendarEngine.getMonths(
      this.deps.calendarStore.config,
    ).length;
    if (this.activeMonth >= monthCount) {
      this.activeMonth = 1;
      this.activeYear += 1;
      return;
    }
    this.activeMonth += 1;
  }

  previousMonth() {
    const monthCount = calendarEngine.getMonths(
      this.deps.calendarStore.config,
    ).length;
    if (this.activeMonth === 1) {
      this.activeMonth = monthCount;
      this.activeYear -= 1;
      return;
    }
    this.activeMonth -= 1;
  }

  clearFilters() {
    this.filterType = null;
    this.selectedLabel = null;
    this.selectedRelatedEntityId = null;
    this.includeUndated = false;
  }

  /** FR-013: toggle the mobile filter-bar collapsed state. */
  toggleFilterBar() {
    this.filterBarCollapsed = !this.filterBarCollapsed;
  }

  /** FR-013: true when any filter is active. */
  get hasActiveFilters(): boolean {
    return !!(
      this.filterType ||
      this.selectedLabel ||
      this.selectedRelatedEntityId ||
      this.includeUndated
    );
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === "calendar" ? "agenda" : "calendar";
  }

  getEntriesByEra(eraId: string): TimelineEntry[] {
    return this.entries.filter((entry) => entry.eraId === eraId);
  }

  getEntriesByType(type: string): TimelineEntry[] {
    return this.entries.filter((entry) => entry.type === type);
  }

  getEntriesInRange(start: number, end: number): TimelineEntry[] {
    return this.entries.filter(
      (entry) => entry.date.year >= start && entry.date.year <= end,
    );
  }
}

const TIMELINE_KEY = "__codex_timeline_store_instance__";
export const timelineStore: TimelineStore =
  (globalThis as Record<string, unknown>)[TIMELINE_KEY] instanceof TimelineStore
    ? ((globalThis as Record<string, unknown>)[TIMELINE_KEY] as TimelineStore)
    : (((globalThis as Record<string, unknown>)[TIMELINE_KEY] =
        new TimelineStore()) as TimelineStore);

if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as unknown as { timelineStore?: TimelineStore }).timelineStore =
    timelineStore;
}
