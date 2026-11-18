import type { WorldCalendar } from "chronology-engine";
import { getCalendarRevision } from "./historical-anchor-chronology";
import { validateAndCreateHistoricalAnchor } from "./historical-anchor-creation";
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
import { checkSessionEditable } from "./historical-anchor-mutation";
import { historicalAnchorSecretSources } from "./hidden-state";
import {
  MAX_HISTORICAL_DRIFT_CHANGES,
  type AdventureCalendarDate,
  type HistoricalAnchor,
  type HistoricalAnchorDriftReport,
  type HistoricalAnchorMutationResult,
  type HistoricalEventSnapshot,
} from "./historical-anchor-types";
import { parseAdventureSession } from "./schemas";
import type { AdventureSession } from "./types";

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

export interface RecordHistoricalAnchorDriftInput {
  expectedRevision: number;
  currentEventSnapshot: HistoricalEventSnapshot | null | undefined;
  calendar: WorldCalendar;
  now: string;
}

export function recordHistoricalAnchorDrift(
  session: AdventureSession,
  input: RecordHistoricalAnchorDriftInput,
): HistoricalAnchorMutationResult<AdventureSession> {
  const precheck = checkSessionEditable(session, input.expectedRevision);
  if (precheck) return precheck;

  const report = detectHistoricalAnchorDrift(
    session.historicalAnchor!,
    input.currentEventSnapshot,
    input.calendar,
  );
  const next = structuredClone(session);
  next.historicalAnchor!.drift = {
    status: report.status,
    rebaseDecisionRequired: report.rebaseDecisionRequired,
    detectedAt: input.now,
    ...(report.currentFingerprint
      ? { currentFingerprint: report.currentFingerprint }
      : {}),
    ...(report.changes.length > 0 ? { changes: report.changes } : {}),
  };
  next.revision += 1;
  next.updatedAt = input.now;

  try {
    return { ok: true, session: parseAdventureSession(next) };
  } catch {
    return {
      ok: false,
      reason: "state-budget-exceeded",
      message: "Recording anchor drift exceeds the session state budget.",
    };
  }
}

export type ResolveHistoricalAnchorDriftInput =
  | {
      expectedRevision: number;
      decision: "keep-baseline";
      now: string;
    }
  | {
      expectedRevision: number;
      decision: "rebase";
      currentEventSnapshot: HistoricalEventSnapshot | null | undefined;
      startDate?: AdventureCalendarDate;
      calendar: WorldCalendar;
      now: string;
    };

export function resolveHistoricalAnchorDrift(
  session: AdventureSession,
  input: ResolveHistoricalAnchorDriftInput,
): HistoricalAnchorMutationResult<AdventureSession> {
  const precheck = checkSessionEditable(session, input.expectedRevision);
  if (precheck) return precheck;

  const next = structuredClone(session);
  const anchor = next.historicalAnchor!;

  if (input.decision === "keep-baseline") {
    anchor.drift = {
      ...anchor.drift,
      rebaseDecisionRequired: false,
    };
    next.revision += 1;
    next.updatedAt = input.now;
    try {
      return { ok: true, session: parseAdventureSession(next) };
    } catch {
      return {
        ok: false,
        reason: "state-budget-exceeded",
        message: "Resolving anchor drift exceeds the session state budget.",
      };
    }
  }

  const rebased = validateAndCreateHistoricalAnchor({
    event: input.currentEventSnapshot,
    startDate: input.startDate ?? anchor.startDate,
    calendar: input.calendar,
    policy: anchor.policy,
    now: input.now,
    revision: next.revision + 1,
  });
  if (!rebased.ok) {
    return {
      ok: false,
      reason: "incompatible-rebase",
      message: rebased.reason,
      validationFailure: rebased,
    };
  }

  const previousSources = new Map(
    historicalAnchorSecretSources(next).map((source) => [
      source.id,
      source.text,
    ]),
  );
  anchor.eventInterval = rebased.anchor.eventInterval;
  anchor.startDate = rebased.anchor.startDate;
  anchor.baseline = rebased.anchor.baseline;
  const currentSources = new Map(
    historicalAnchorSecretSources(next).map((source) => [
      source.id,
      source.text,
    ]),
  );
  anchor.revealedFactIds = anchor.revealedFactIds.filter(
    (id) =>
      previousSources.has(id) &&
      previousSources.get(id) === currentSources.get(id),
  );
  anchor.drift = {
    status: "clean",
    rebaseDecisionRequired: false,
  };
  next.revision += 1;
  next.updatedAt = input.now;

  try {
    return { ok: true, session: parseAdventureSession(next) };
  } catch {
    return {
      ok: false,
      reason: "state-budget-exceeded",
      message:
        "Rebasing the historical anchor exceeds the session state budget.",
    };
  }
}

export {
  projectPlayerHistoricalAnchor,
  projectGmHistoricalAnchor,
} from "./historical-anchor-projections";

export { computeHistoricalEventFingerprint } from "./historical-anchor-fingerprint";

export {
  validateHistoricalAnchorCompatibility,
  type ValidateHistoricalAnchorCompatibilityInput,
} from "./historical-anchor-compatibility";
export {
  validateAndCreateHistoricalAnchor,
  type CreateHistoricalAnchorInput,
} from "./historical-anchor-creation";
export {
  deriveHistoricalAnchorProgress,
  transitionHistoricalAnchorProgress,
  type TransitionHistoricalAnchorProgressInput,
} from "./historical-anchor-progress";
