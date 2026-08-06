import {
  calendarEngine,
  parseDirectDateInput,
  type DateSelection,
  type WorldCalendar,
} from "chronology-engine";

export function formatDirectDateInput(
  selection: DateSelection,
  config: WorldCalendar,
): string {
  if (selection.precision === "year") return String(selection.year);
  if (
    selection.precision !== "day" ||
    selection.day === undefined ||
    !selection.unitId
  ) {
    return "";
  }
  const monthIndex = calendarEngine
    .getMonths(config)
    .findIndex((month) => month.id === selection.unitId);
  return monthIndex >= 0
    ? `${String(selection.day).padStart(2, "0")}${String(monthIndex + 1).padStart(2, "0")}${selection.year}`
    : "";
}

export function parsePickerDateInput(input: string, config: WorldCalendar) {
  if (!input.trim()) return {};
  const parsed = parseDirectDateInput(input, config);
  if (!parsed) {
    return {
      error:
        "Use a year (such as 45 or -594), DDMMYYYY, DDMM-YYYY, or DD/MM/-YYYY.",
    };
  }
  const revision = config.revision || 1;
  if (parsed.day === undefined || parsed.month === undefined) {
    return {
      selection: {
        precision: "year" as const,
        year: parsed.year,
        calendarRevision: revision,
      },
    };
  }
  const months = calendarEngine.getMonths(config);
  return {
    selection: {
      precision: "day" as const,
      year: parsed.year,
      unitId: months[parsed.month - 1]?.id || months[0]?.id,
      day: parsed.day,
      calendarRevision: revision,
    },
  };
}

export function optionPatch(
  columnId: string,
  optionId: string,
): Partial<DateSelection> {
  if (columnId === "year") return { year: Number(optionId) };
  if (columnId === "unit") return { unitId: optionId };
  if (columnId === "day") return { day: Number(optionId) };
  return columnId === "anchor" ? { anchorId: optionId } : {};
}

export function precisionPatch(
  precision: DateSelection["precision"],
  selection: DateSelection,
  config: WorldCalendar,
): Partial<DateSelection> {
  const patch: Partial<DateSelection> = { precision };
  if ((precision === "unit" || precision === "day") && !selection.unitId) {
    patch.unitId = config.months[0]?.id;
  }
  if (precision === "day" && selection.day === undefined) patch.day = 1;
  if (precision === "anchor" && !selection.anchorId)
    patch.anchorId = config.anchors?.[0]?.id;
  return patch;
}

export function normalizedSelectionForSave(
  selection: DateSelection,
): DateSelection {
  const normalized = { ...selection };
  if (normalized.precision === "year") {
    delete normalized.unitId;
    delete normalized.day;
    delete normalized.anchorId;
  } else if (normalized.precision === "unit") {
    delete normalized.day;
    delete normalized.anchorId;
  } else if (normalized.precision === "day") {
    delete normalized.anchorId;
  } else {
    delete normalized.unitId;
    delete normalized.day;
  }
  return normalized;
}
