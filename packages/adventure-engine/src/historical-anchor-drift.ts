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

  const changes: string[] = [];
  if (clampText(currentEventSnapshot.title) !== anchor.baseline.title) {
    changes.push("title");
  }
  const { rawStart, rawEnd } = extractEventRawDates(currentEventSnapshot);
  const currentDates = canonicalJson({
    start: rawStart ?? null,
    end: rawEnd ?? null,
    approximate: Boolean(currentEventSnapshot.approximate),
  });
  const baselineDates = canonicalJson({
    start: anchor.eventInterval.start,
    end: anchor.eventInterval.end ?? null,
    approximate: Boolean(anchor.eventInterval.approximate),
  });
  if (currentDates !== baselineDates) {
    changes.push("dates");
  }
  const currentFacts = canonicalJson(
    extractDocumentedFacts(currentEventSnapshot),
  );
  const baselineFacts = canonicalJson(anchor.baseline.documentedFacts);
  if (currentFacts !== baselineFacts) {
    changes.push("documentedFacts");
  }
  const currentRefs = canonicalJson(
    normalizeEntityRefs(currentEventSnapshot.relevantEntityRefs),
  );
  const baselineRefs = canonicalJson(anchor.baseline.relevantEntityRefs);
  if (currentRefs !== baselineRefs) {
    changes.push("relevantEntityRefs");
  }
  if (getCalendarRevision(calendar) !== anchor.baseline.calendarRevision) {
    changes.push("calendarRevision");
  }
  if (changes.length === 0) {
    changes.push("content");
  }

  return {
    status: "vault-modified",
    rebaseDecisionRequired: true,
    currentFingerprint,
    changes: changes.slice(0, MAX_HISTORICAL_DRIFT_CHANGES),
  };
}
