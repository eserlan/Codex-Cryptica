import type { WorldCalendar } from "chronology-engine";
import {
  dateToDayInterval,
  intervalToDayInterval,
} from "./historical-anchor-chronology";
import {
  validateHistoricalAnchorCompatibility,
  type ValidateHistoricalAnchorCompatibilityInput,
} from "./historical-anchor-compatibility";
import {
  clampText,
  extractDocumentedFacts,
  normalizeEntityRefs,
} from "./historical-anchor-event";
import { computeHistoricalEventFingerprintWithFacts } from "./historical-anchor-fingerprint";
import { inferOpenMechanisms } from "./historical-anchor-mechanisms";
import { deriveStatusFromIntervals } from "./historical-anchor-progress";
import { parseHistoricalAnchor } from "./historical-anchor-schemas";
import {
  CURRENT_HISTORICAL_ANCHOR_VERSION,
  type HistoricalAnchor,
  type HistoricalAnchorBaseline,
  type HistoricalAnchorCompatibilitySuccess,
  type HistoricalAnchorCreationResult,
  type HistoricalAnchorPolicy,
  type HistoricalAnchorProgress,
  type HistoricalEventSnapshot,
} from "./historical-anchor-types";

export interface CreateHistoricalAnchorInput extends ValidateHistoricalAnchorCompatibilityInput {
  policy?: HistoricalAnchorPolicy;
  now: string;
  revision?: number;
  setupRefId?: string;
}

export function validateAndCreateHistoricalAnchor(
  input: CreateHistoricalAnchorInput,
): HistoricalAnchorCreationResult {
  const compatibility = validateHistoricalAnchorCompatibility(input);
  if (!compatibility.ok) return compatibility;

  const event = input.event!;
  const baseline = captureHistoricalAnchorBaseline(
    event,
    compatibility,
    input.calendar,
    input.now,
  );
  const progress = createInitialHistoricalAnchorProgress(input, compatibility);
  const anchorCandidate: HistoricalAnchor = {
    version: CURRENT_HISTORICAL_ANCHOR_VERSION,
    policy: input.policy ?? "preserve",
    eventRecordId: event.id.trim(),
    eventInterval: compatibility.eventInterval,
    startDate: compatibility.startDate,
    baseline,
    revealedFactIds: [],
    progress,
    drift: {
      status: "clean",
      rebaseDecisionRequired: false,
    },
  };

  return { ok: true, anchor: parseHistoricalAnchor(anchorCandidate) };
}

function captureHistoricalAnchorBaseline(
  event: HistoricalEventSnapshot,
  compatibility: HistoricalAnchorCompatibilitySuccess,
  calendar: WorldCalendar,
  now: string,
): HistoricalAnchorBaseline {
  const documentedFacts = extractDocumentedFacts(event);
  const relevantEntityRefs = normalizeEntityRefs(event.relevantEntityRefs);
  const openMechanisms = inferOpenMechanisms(
    event,
    compatibility.eventInterval,
    documentedFacts,
    relevantEntityRefs,
  );

  return {
    title: clampText(event.title),
    contentFingerprint: computeHistoricalEventFingerprintWithFacts(
      event,
      calendar,
      documentedFacts,
    ),
    capturedAt: now,
    calendarRevision: compatibility.calendarRevision,
    documentedFacts,
    openMechanisms,
    relevantEntityRefs,
  };
}

function createInitialHistoricalAnchorProgress(
  input: CreateHistoricalAnchorInput,
  compatibility: HistoricalAnchorCompatibilitySuccess,
): HistoricalAnchorProgress {
  const startInterval = dateToDayInterval(
    compatibility.startDate,
    input.calendar,
  )!;
  const eventIntervalDays = intervalToDayInterval(
    compatibility.eventInterval,
    input.calendar,
  )!;

  return {
    status: deriveStatusFromIntervals(startInterval, eventIntervalDays),
    updatedAtRevision: input.revision ?? 0,
    updatedAt: input.now,
    causalRefs: [
      {
        kind: "setup",
        refId: input.setupRefId ?? "adventure-setup",
        summary: "Historical anchor initialized.",
      },
    ],
  };
}
