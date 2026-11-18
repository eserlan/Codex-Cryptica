import type { WorldCalendar } from "chronology-engine";
import { getCalendarRevision } from "./historical-anchor-chronology";
import {
  clampText,
  extractDocumentedFacts,
  extractEventRawDates,
  normalizeEntityRefs,
} from "./historical-anchor-event";
import {
  canonicalJson,
  computeHistoricalEventFingerprint,
} from "./historical-anchor-fingerprint";
import {
  MAX_HISTORICAL_DRIFT_CHANGES,
  type HistoricalAnchor,
  type HistoricalAnchorDriftReport,
  type HistoricalDateInterval,
  type HistoricalEventSnapshot,
} from "./historical-anchor-types";

export function detectHistoricalAnchorDrift(
  anchor: HistoricalAnchor,
  currentEventSnapshot: HistoricalEventSnapshot | null | undefined,
  calendar: WorldCalendar,
): HistoricalAnchorDriftReport {
  if (
    !currentEventSnapshot ||
    currentEventSnapshot.type !== "event" ||
    currentEventSnapshot.id.trim() !== anchor.eventRecordId
  ) {
    return {
      status: "vault-missing",
      rebaseDecisionRequired: true,
      changes: ["Vault event record is missing or no longer an event."],
    };
  }

  const currentFingerprint = computeHistoricalEventFingerprint(
    currentEventSnapshot,
    calendar,
  );
  if (currentFingerprint === anchor.baseline.contentFingerprint) {
    return {
      status: "clean",
      rebaseDecisionRequired: false,
      currentFingerprint,
      changes: [],
    };
  }

  return {
    status: "vault-modified",
    rebaseDecisionRequired: true,
    currentFingerprint,
    changes: collectHistoricalAnchorChanges(
      anchor,
      currentEventSnapshot,
      calendar,
    ),
  };
}

function collectHistoricalAnchorChanges(
  anchor: HistoricalAnchor,
  event: HistoricalEventSnapshot,
  calendar: WorldCalendar,
): string[] {
  const changes: string[] = [];
  if (clampText(event.title) !== anchor.baseline.title) {
    changes.push("title");
  }
  if (hasHistoricalEventDateChanges(event, anchor.eventInterval)) {
    changes.push("dates");
  }
  const currentFacts = extractDocumentedFacts(event);
  if (hasCanonicalChange(currentFacts, anchor.baseline.documentedFacts)) {
    changes.push("documentedFacts");
  }
  const currentRefs = normalizeEntityRefs(event.relevantEntityRefs);
  if (hasCanonicalChange(currentRefs, anchor.baseline.relevantEntityRefs)) {
    changes.push("relevantEntityRefs");
  }
  if (getCalendarRevision(calendar) !== anchor.baseline.calendarRevision) {
    changes.push("calendarRevision");
  }
  if (changes.length === 0) {
    changes.push("content");
  }
  return changes.slice(0, MAX_HISTORICAL_DRIFT_CHANGES);
}

function hasHistoricalEventDateChanges(
  event: HistoricalEventSnapshot,
  interval: HistoricalDateInterval,
): boolean {
  const { rawStart, rawEnd } = extractEventRawDates(event);
  const currentDates = {
    start: rawStart ?? null,
    end: rawEnd ?? null,
    approximate: Boolean(event.approximate),
  };
  const baselineDates = {
    start: interval.start,
    end: interval.end ?? null,
    approximate: Boolean(interval.approximate),
  };
  return hasCanonicalChange(currentDates, baselineDates);
}

function hasCanonicalChange(current: unknown, baseline: unknown): boolean {
  return canonicalJson(current) !== canonicalJson(baseline);
}
