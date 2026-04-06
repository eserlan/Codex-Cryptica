import type { TemporalMetadata } from "schema";

export function validateTemporal(data: TemporalMetadata): string | null {
  if (data.year === undefined || data.year === null) {
    return "Year is required for chronological placement.";
  }

  if (typeof data.year !== "number" || isNaN(data.year)) {
    return "Year must be a valid number.";
  }

  if (data.month !== undefined && (data.month < 1 || data.month > 12)) {
    return "Month must be between 1 and 12.";
  }

  if (data.day !== undefined && (data.day < 1 || data.day > 31)) {
    return "Day must be between 1 and 31.";
  }

  return null;
}

export function validateTemporalRange(
  start?: TemporalMetadata,
  end?: TemporalMetadata,
): string | null {
  if (!start || !end) return null;

  const startError = validateTemporal(start);
  if (startError) return `Start date error: ${startError}`;

  const endError = validateTemporal(end);
  if (endError) return `End date error: ${endError}`;

  if (start.year > end.year) {
    return "Start year cannot be after end year.";
  }

  if (start.year === end.year) {
    const startMonth = start.month ?? 1;
    const endMonth = end.month ?? 1;
    if (startMonth > endMonth) {
      return "Start month cannot be after end month.";
    }

    if (startMonth === endMonth) {
      const startDay = start.day ?? 1;
      const endDay = end.day ?? 1;
      if (startDay > endDay) {
        return "Start day cannot be after end day.";
      }
    }
  }

  return null;
}
