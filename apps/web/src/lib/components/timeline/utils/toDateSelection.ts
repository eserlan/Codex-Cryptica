import type { TemporalMetadata } from "schema";
import type { DateSelection, WorldCalendar } from "chronology-engine";
import { calendarEngine } from "chronology-engine";

export function toDateSelection(
  val: TemporalMetadata | DateSelection | undefined,
  refVal: TemporalMetadata | DateSelection | undefined,
  config: WorldCalendar,
): DateSelection {
  const months = calendarEngine.getMonths(config);
  const revision = config.revision || 1;

  const hasValidYear = val && "year" in val && val.year !== undefined;

  if (!val || !hasValidYear) {
    if (refVal && "year" in refVal && refVal.year !== undefined) {
      return {
        precision:
          "precision" in refVal && refVal.precision ? refVal.precision : "year",
        year: refVal.year,
        calendarRevision: revision,
        label: val?.label || undefined,
      };
    }
    return {
      precision: "year",
      year: config.presentYear || 0,
      calendarRevision: revision,
      label: val?.label || undefined,
    };
  }

  if ("precision" in val && val.precision) {
    return {
      ...val,
      calendarRevision: val.calendarRevision ?? revision,
    };
  }

  let precision: "year" | "unit" | "day" = "year";
  let unitId: string | undefined = undefined;
  let day: number | undefined = undefined;

  const month = "month" in val ? val.month : undefined;
  if (month !== undefined) {
    precision = val.day !== undefined ? "day" : "unit";
    const mIndex = month - 1;
    if (mIndex >= 0 && mIndex < months.length) {
      unitId = months[mIndex].id;
    } else {
      unitId = months[0]?.id;
    }
    if (val.day !== undefined) {
      day = val.day;
    }
  }

  return {
    precision,
    year: val.year,
    unitId,
    day,
    calendarRevision: revision,
    label: val.label,
  };
}
