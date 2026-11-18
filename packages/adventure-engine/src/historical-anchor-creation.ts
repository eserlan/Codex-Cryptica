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
  type HistoricalAnchorCreationResult,
  type HistoricalAnchorPolicy,
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
  const policy: HistoricalAnchorPolicy = input.policy ?? "preserve";
  const documentedFacts = extractDocumentedFacts(event);
  const relevantEntityRefs = normalizeEntityRefs(event.relevantEntityRefs);
  const openMechanisms = inferOpenMechanisms(
    event,
    compatibility.eventInterval,
    documentedFacts,
    relevantEntityRefs,
  );
  const startInterval = dateToDayInterval(
    compatibility.startDate,
    input.calendar,
  )!;
  const eventIntervalDays = intervalToDayInterval(
    compatibility.eventInterval,
    input.calendar,
  )!;

  const anchorCandidate: HistoricalAnchor = {
    version: CURRENT_HISTORICAL_ANCHOR_VERSION,
    policy,
    eventRecordId: event.id.trim(),
    eventInterval: compatibility.eventInterval,
    startDate: compatibility.startDate,
    baseline: {
      title: clampText(event.title),
      contentFingerprint: computeHistoricalEventFingerprintWithFacts(
        event,
        input.calendar,
        documentedFacts,
      ),
      capturedAt: input.now,
      calendarRevision: compatibility.calendarRevision,
      documentedFacts,
      openMechanisms,
      relevantEntityRefs,
    },
    revealedFactIds: [],
    progress: {
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
    },
    drift: {
      status: "clean",
      rebaseDecisionRequired: false,
    },
  };

  return { ok: true, anchor: parseHistoricalAnchor(anchorCandidate) };
}
