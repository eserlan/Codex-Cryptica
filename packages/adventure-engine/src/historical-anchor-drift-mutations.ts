import type { WorldCalendar } from "chronology-engine";
import { validateAndCreateHistoricalAnchor } from "./historical-anchor-creation";
import { detectHistoricalAnchorDrift } from "./historical-anchor-drift";
import {
  checkSessionEditable,
  finalizeHistoricalAnchorMutation,
} from "./historical-anchor-mutation";
import { historicalAnchorSecretSources } from "./hidden-state";
import type {
  AdventureCalendarDate,
  HistoricalAnchor,
  HistoricalAnchorMutationResult,
  HistoricalEventSnapshot,
} from "./historical-anchor-types";
import type { AdventureSession } from "./types";

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
  return finalizeHistoricalAnchorMutation(
    next,
    input.now,
    "Recording anchor drift exceeds the session state budget.",
  );
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

type RebaseHistoricalAnchorDriftInput = Extract<
  ResolveHistoricalAnchorDriftInput,
  { decision: "rebase" }
>;

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
    return finalizeHistoricalAnchorMutation(
      next,
      input.now,
      "Resolving anchor drift exceeds the session state budget.",
    );
  }

  return rebaseHistoricalAnchor(next, input);
}

function rebaseHistoricalAnchor(
  next: AdventureSession,
  input: RebaseHistoricalAnchorDriftInput,
): HistoricalAnchorMutationResult<AdventureSession> {
  const anchor = next.historicalAnchor!;
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

  replaceHistoricalAnchorBaseline(next, rebased.anchor);
  return finalizeHistoricalAnchorMutation(
    next,
    input.now,
    "Rebasing the historical anchor exceeds the session state budget.",
  );
}

function replaceHistoricalAnchorBaseline(
  session: AdventureSession,
  rebased: HistoricalAnchor,
): void {
  const anchor = session.historicalAnchor!;
  const previousSources = historicalAnchorSourceTexts(session);
  anchor.eventInterval = rebased.eventInterval;
  anchor.startDate = rebased.startDate;
  anchor.baseline = rebased.baseline;
  const currentSources = historicalAnchorSourceTexts(session);
  anchor.revealedFactIds = anchor.revealedFactIds.filter(
    (id) =>
      previousSources.has(id) &&
      previousSources.get(id) === currentSources.get(id),
  );
  anchor.drift = {
    status: "clean",
    rebaseDecisionRequired: false,
  };
}

function historicalAnchorSourceTexts(
  session: AdventureSession,
): Map<string, string> {
  return new Map(
    historicalAnchorSecretSources(session).map((source) => [
      source.id,
      source.text,
    ]),
  );
}
