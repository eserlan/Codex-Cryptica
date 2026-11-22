import type { WorldCalendar } from "chronology-engine";
import { getCalendarRevision } from "./historical-anchor-chronology";
import {
  clampText,
  extractDocumentedFacts,
  normalizeEntityRefs,
} from "./historical-anchor-event";
import type {
  HistoricalAnchorDocumentedFact,
  HistoricalEventSnapshot,
} from "./historical-anchor-types";

function fnv1a32(input: string, seed: number): string {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
    .join(",")}}`;
}

function fingerprintText(value: string | undefined): string | null {
  return value ? clampText(value, 4_000) : null;
}

function eventEndDate(event: HistoricalEventSnapshot) {
  if (event.end_date) return event.end_date;
  return event.start_date ? null : (event.date ?? null);
}

function fingerprintCalendarRevision(calendar?: WorldCalendar): number | null {
  return calendar ? getCalendarRevision(calendar) : null;
}

/**
 * Deterministic synchronous digest over canonical Vault event snapshot fields.
 */
export function computeHistoricalEventFingerprint(
  event: HistoricalEventSnapshot,
  calendar?: WorldCalendar,
): string {
  return computeHistoricalEventFingerprintWithFacts(
    event,
    calendar,
    extractDocumentedFacts(event),
  );
}

export function computeHistoricalEventFingerprintWithFacts(
  event: HistoricalEventSnapshot,
  calendar: WorldCalendar | undefined,
  documentedFacts: HistoricalAnchorDocumentedFact[],
): string {
  const relevantEntityRefs = normalizeEntityRefs(event.relevantEntityRefs);
  const payload = canonicalJson({
    id: event.id.trim(),
    type: event.type.trim(),
    title: clampText(event.title),
    startDate: event.start_date ?? event.date ?? null,
    endDate: eventEndDate(event),
    approximate: Boolean(event.approximate),
    dateLabel: fingerprintText(event.dateLabel),
    content: fingerprintText(event.content),
    lore: fingerprintText(event.lore),
    documentedFacts,
    relevantEntityRefs,
    calendarRevision: fingerprintCalendarRevision(calendar),
  });
  return (
    fnv1a32(payload, 0x811c9dc5) +
    fnv1a32(payload, 0x9e3779b9) +
    fnv1a32(payload, 0x85ebca6b) +
    fnv1a32(payload, 0xc2b2ae35)
  );
}
