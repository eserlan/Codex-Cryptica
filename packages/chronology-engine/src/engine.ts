import type {
  TemporalMetadata,
  WorldCalendar,
  CalendarMonth,
  DateSelection,
  CalendarSnapshot,
  RepairState,
  WheelColumnState,
  WheelOption,
} from "./types";

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
  // Anchors the grid: epoch day 0 (year 0, Jan 1) is a Monday (index 1 in Sun=0 column order).
  // Verified: getTimelineValue({year:2026,month:6,day:1}) % 7 === 0; +1 → column 1 = Monday ✓
  epochWeekday: 1,
};

const daysInYearCache = new WeakMap<WorldCalendar, number>();

function getConfig(
  configOrSnapshot: WorldCalendar | CalendarSnapshot,
): WorldCalendar {
  return configOrSnapshot && "config" in configOrSnapshot
    ? configOrSnapshot.config
    : (configOrSnapshot as WorldCalendar);
}

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
  isValid(
    date: TemporalMetadata | DateSelection | null | undefined,
    configOrSnapshot: WorldCalendar | CalendarSnapshot,
  ): boolean {
    if (
      !date ||
      date.year === undefined ||
      date.year === null ||
      !Number.isSafeInteger(date.year)
    )
      return false;

    const config = getConfig(configOrSnapshot);
    const months = this.getMonths(config);

    // If it's a new DateSelection shape
    if ("precision" in date && date.precision) {
      if (date.precision === "year") {
        return true;
      }

      if (date.precision === "unit") {
        if (!date.unitId) return false;
        return months.some((m) => m.id === date.unitId);
      }

      if (date.precision === "day") {
        if (
          !date.unitId ||
          date.day === undefined ||
          !Number.isSafeInteger(date.day)
        )
          return false;
        const month = months.find((m) => m.id === date.unitId);
        if (!month) return false;
        return date.day >= 1 && date.day <= month.days;
      }

      if (date.precision === "anchor") {
        if (!date.anchorId) return false;
        const anchors = config.anchors || [];
        return anchors.some((a) => a.id === date.anchorId);
      }

      return false;
    }

    // Legacy TemporalMetadata shape
    const legacyDate = date as TemporalMetadata;
    if (legacyDate.month !== undefined) {
      if (
        !Number.isSafeInteger(legacyDate.month) ||
        legacyDate.month < 1 ||
        legacyDate.month > months.length
      )
        return false;

      if (legacyDate.day !== undefined) {
        if (!Number.isSafeInteger(legacyDate.day)) return false;
        const monthDays = months[legacyDate.month - 1].days;
        if (legacyDate.day < 1 || legacyDate.day > monthDays) return false;
      }
    } else if (legacyDate.day !== undefined) {
      return false;
    }

    return true;
  }

  /**
   * Format a date for human readability.
   */
  format(
    date: TemporalMetadata | DateSelection,
    configOrSnapshot: WorldCalendar | CalendarSnapshot,
  ): string {
    if (date.label) return date.label;

    const config = getConfig(configOrSnapshot);
    const months = this.getMonths(config);

    // Handle new DateSelection shape
    if ("precision" in date && date.precision) {
      let suffix = "";
      if (config.epochLabel) {
        suffix = ` ${config.epochLabel}`;
      }

      if (date.precision === "year") {
        return `${date.year}${suffix}`;
      }

      if (date.precision === "unit") {
        const month = months.find((m) => m.id === date.unitId);
        const name = month ? month.name : `Unit ${date.unitId}`;
        return `${name} ${date.year}${suffix}`;
      }

      if (date.precision === "day") {
        const month = months.find((m) => m.id === date.unitId);
        const name = month ? month.name : `Unit ${date.unitId}`;
        return `${date.day} ${name} ${date.year}${suffix}`;
      }

      if (date.precision === "anchor") {
        const anchors = config.anchors || [];
        const anchor = anchors.find((a) => a.id === date.anchorId);
        const name = anchor ? anchor.name : `Anchor ${date.anchorId}`;
        return `${name} ${date.year}${suffix}`;
      }
    }

    // Legacy shape formatting
    const legacyDate = date as TemporalMetadata;
    const parts: string[] = [];

    if (legacyDate.day !== undefined && legacyDate.month !== undefined) {
      parts.push(`${legacyDate.day}`);
    }

    if (legacyDate.month !== undefined) {
      const monthName =
        months[legacyDate.month - 1]?.name || `Month ${legacyDate.month}`;
      parts.push(monthName);
    }

    let yearStr = `${legacyDate.year}`;
    if (config.epochLabel) {
      yearStr += ` ${config.epochLabel}`;
    }
    parts.push(yearStr);

    return parts.join(" ");
  }

  /**
   * Convert a date to a linear numeric value for sorting and positioning.
   * Note: Supports both legacy TemporalMetadata and modern DateSelection shapes.
   */
  getTimelineValue(
    date: TemporalMetadata | DateSelection,
    configOrSnapshot: WorldCalendar | CalendarSnapshot,
  ): number {
    const config = getConfig(configOrSnapshot);
    const months = this.getMonths(config);
    const daysInYear = this.getDaysInYear(config);

    let value = date.year * daysInYear;

    // Handle DateSelection structure
    if ("precision" in date && date.precision) {
      if (date.precision === "unit" || date.precision === "day") {
        const unitIndex = months.findIndex((m) => m.id === date.unitId);
        if (unitIndex !== -1) {
          for (let i = 0; i < unitIndex; i++) {
            value += months[i].days;
          }
        }
        if (date.precision === "day" && date.day !== undefined) {
          value += date.day - 1;
        }
      } else if (date.precision === "anchor" && date.anchorId) {
        const anchors = config.anchors || [];
        const anchor = anchors.find((a) => a.id === date.anchorId);
        if (anchor && anchor.afterMonthId) {
          const unitIndex = months.findIndex(
            (m) => m.id === anchor.afterMonthId,
          );
          if (unitIndex !== -1) {
            for (let i = 0; i < unitIndex; i++) {
              value += months[i].days;
            }
          }
          if (anchor.afterDay !== undefined) {
            value += anchor.afterDay;
          }
        }
      }
      return value;
    }

    // Legacy structure
    const legacyDate = date as TemporalMetadata;
    if (legacyDate.month !== undefined) {
      for (let i = 0; i < legacyDate.month - 1; i++) {
        value += months[i].days;
      }

      if (legacyDate.day !== undefined) {
        value += legacyDate.day - 1;
      }
    }

    return value;
  }

  /**
   * Derive the columns and their options for scroll-wheel representation.
   */
  deriveWheelColumns(
    selection: DateSelection,
    snapshot: CalendarSnapshot,
  ): WheelColumnState[] {
    const config = snapshot.config;
    const months = this.getMonths(config);
    const columns: WheelColumnState[] = [];

    // Year Column (always present)
    const yearOptions: WheelOption[] = [];
    const currentYear = selection.year;
    for (let y = currentYear - 10; y <= currentYear + 10; y++) {
      yearOptions.push({
        id: String(y),
        label: String(y),
        value: y,
      });
    }
    columns.push({
      id: "year",
      label: "Year",
      options: yearOptions,
      selectedId: String(currentYear),
      canDirectEnter: true,
    });

    if (selection.precision === "unit" || selection.precision === "day") {
      // Unit Column
      const unitOptions = months.map((m) => ({
        id: m.id,
        label: m.name,
        value: m.id,
      }));
      const activeUnitId = selection.unitId || (months[0]?.id ?? "");

      columns.push({
        id: "unit",
        label: "Unit",
        options: unitOptions,
        selectedId: activeUnitId,
        canDirectEnter: false,
      });

      if (selection.precision === "day") {
        // Day Column
        const activeMonth =
          months.find((m) => m.id === activeUnitId) || months[0];
        const dayCount = activeMonth ? activeMonth.days : 30;
        const dayOptions = Array.from({ length: dayCount }, (_, i) => ({
          id: String(i + 1),
          label: String(i + 1),
          value: i + 1,
        }));

        const selectedDay = selection.day
          ? Math.max(1, Math.min(selection.day, dayCount))
          : 1;

        columns.push({
          id: "day",
          label: "Day",
          options: dayOptions,
          selectedId: String(selectedDay),
          canDirectEnter: true,
        });
      }
    } else if (selection.precision === "anchor") {
      const anchors = config.anchors || [];
      const anchorOptions = anchors.map((a) => ({
        id: a.id,
        label: a.name,
        value: a.id,
      }));
      columns.push({
        id: "anchor",
        label: "Anchor",
        options: anchorOptions,
        selectedId: selection.anchorId || (anchors[0]?.id ?? ""),
        canDirectEnter: false,
      });
    }

    return columns;
  }

  /**
   * Safely apply changes from one column top-down, capping lower columns.
   */
  applyParentChange(
    selection: DateSelection,
    patch: Partial<DateSelection>,
    snapshot: CalendarSnapshot,
  ): DateSelection {
    const updated = { ...selection, ...patch };
    const config = snapshot.config;
    const months = this.getMonths(config);

    if (updated.precision === "day" && updated.unitId) {
      const month = months.find((m) => m.id === updated.unitId) || months[0];
      if (month && updated.day !== undefined && updated.day > month.days) {
        updated.day = month.days;
      }
    }

    return updated;
  }

  /**
   * Determine the repair state of a saved DateSelection.
   * Returns a RepairState object with explanation and suggestions, or null if perfectly valid.
   */
  getRepairState(
    selection: DateSelection,
    currentSnapshot: CalendarSnapshot,
  ): RepairState | null {
    if (
      selection.calendarRevision !== undefined &&
      selection.calendarRevision !== currentSnapshot.revision
    ) {
      const suggested: DateSelection = {
        ...selection,
        calendarRevision: currentSnapshot.revision,
      };
      if (this.isValid(selection, currentSnapshot)) {
        return {
          originalSelection: selection,
          suggestedSelection: suggested,
          reason: "stale-revision",
          requiresConfirmation: true,
        };
      }
    }

    if (this.isValid(selection, currentSnapshot)) {
      return null;
    }

    const config = currentSnapshot.config;
    const months = this.getMonths(config);
    const suggested: DateSelection = {
      ...selection,
      calendarRevision: currentSnapshot.revision,
    };

    if (selection.precision === "unit" || selection.precision === "day") {
      const unitExists = months.some((m) => m.id === selection.unitId);
      if (!unitExists) {
        const fallbackMonth = months[0];
        suggested.unitId = fallbackMonth?.id ?? "";
        if (selection.precision === "day" && selection.day !== undefined) {
          suggested.day = Math.min(selection.day, fallbackMonth?.days ?? 30);
        }
        return {
          originalSelection: selection,
          suggestedSelection: suggested,
          reason: "missing-unit",
          requiresConfirmation: true,
        };
      }

      const month = months.find((m) => m.id === selection.unitId)!;
      if (
        selection.precision === "day" &&
        selection.day !== undefined &&
        selection.day > month.days
      ) {
        suggested.day = month.days;
        return {
          originalSelection: selection,
          suggestedSelection: suggested,
          reason: "day-overflow",
          requiresConfirmation: true,
        };
      }
    } else if (selection.precision === "anchor") {
      const anchors = config.anchors || [];
      const anchorExists = anchors.some((a) => a.id === selection.anchorId);
      if (!anchorExists) {
        const fallbackAnchor = anchors[0];
        if (fallbackAnchor) {
          suggested.anchorId = fallbackAnchor.id;
        } else {
          // If no anchors exist, fallback to unit or day precision
          suggested.precision = "unit";
          suggested.unitId = months[0]?.id ?? "";
        }
        return {
          originalSelection: selection,
          suggestedSelection: suggested,
          reason: "missing-anchor",
          requiresConfirmation: true,
        };
      }
    }

    // Outdated revision but otherwise valid? If it's valid, it's not a real repair error.
    // If we reached here and it is still invalid, treat as stale-revision
    return {
      originalSelection: selection,
      suggestedSelection: suggested,
      reason: "stale-revision",
      requiresConfirmation: true,
    };
  }
}

export const calendarEngine = new CalendarEngine();

export function parseDirectDateInput(
  input: string,
  configOrSnapshot: WorldCalendar | CalendarSnapshot,
): TemporalMetadata | null {
  const config = getConfig(configOrSnapshot);
  const trimmed = input.trim();
  if (!trimmed) return null;

  const compactMatch = trimmed.match(/^(\d{2})(\d{2})(-?\d+)$/);
  const separatedMatch =
    trimmed.match(/^(\d{1,2})[./\s](\d{1,2})[./\s](-?\d+)$/) ||
    trimmed.match(/^(\d{1,2})-(\d{1,2})-(-?\d+)$/);
  const match = compactMatch || separatedMatch;
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year)
  ) {
    return null;
  }

  const date = { year, month, day };
  return calendarEngine.isValid(date, config) ? date : null;
}
