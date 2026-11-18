import type { WorldCalendar } from "chronology-engine";
import {
  intervalToDayInterval,
  projectElapsedDayInterval,
} from "./historical-anchor-chronology";
import { clampText } from "./historical-anchor-event";
import { checkSessionEditable } from "./historical-anchor-mutation";
import {
  DEFAULT_APPROACHING_THRESHOLD_DAYS,
  MAX_HISTORICAL_CAUSAL_REFS,
  type DayInterval,
  type HistoricalAnchorCausalRef,
  type HistoricalAnchorMutationResult,
  type HistoricalAnchorProgressStatus,
} from "./historical-anchor-types";
import { parseAdventureSession } from "./schemas";
import type { AdventureSession } from "./types";

export function deriveStatusFromIntervals(
  current: DayInterval,
  event: DayInterval,
  approachingThresholdDays = DEFAULT_APPROACHING_THRESHOLD_DAYS,
): HistoricalAnchorProgressStatus {
  if (current.first >= event.first) return "reached";
  if (event.first - current.last <= approachingThresholdDays) {
    return "approaching";
  }
  return "upcoming";
}

export function deriveHistoricalAnchorProgress(
  session: AdventureSession,
  calendar: WorldCalendar,
  options?: { approachingThresholdDays?: number },
): HistoricalAnchorProgressStatus {
  const anchor = session.historicalAnchor;
  if (!anchor) return "unresolved";
  if (anchor.progress.status === "diverged") return "diverged";

  const elapsedMinutes = session.worldTime?.elapsedMinutes ?? 0;
  const currentInterval = projectElapsedDayInterval(
    anchor.startDate,
    calendar,
    elapsedMinutes,
  );
  const eventInterval = intervalToDayInterval(anchor.eventInterval, calendar);
  if (!currentInterval || !eventInterval) return "unresolved";

  return deriveStatusFromIntervals(
    currentInterval,
    eventInterval,
    options?.approachingThresholdDays,
  );
}

export interface TransitionHistoricalAnchorProgressInput {
  expectedRevision: number;
  status: HistoricalAnchorProgressStatus;
  causalRefs: HistoricalAnchorCausalRef[];
  reason?: string;
  now: string;
}

export function transitionHistoricalAnchorProgress(
  session: AdventureSession,
  input: TransitionHistoricalAnchorProgressInput,
): HistoricalAnchorMutationResult<AdventureSession> {
  const precheck = checkSessionEditable(session, input.expectedRevision);
  if (precheck) return precheck;

  if (input.causalRefs.length === 0) {
    return {
      ok: false,
      reason: "missing-causal-ref",
      message:
        "Post-setup historical anchor progress transitions require at least one causalRef.",
    };
  }

  const next = structuredClone(session);
  const anchor = next.historicalAnchor!;
  const nextRevision = next.revision + 1;
  const defaultDivergedReason =
    anchor.policy === "alternate"
      ? "Alternate timeline: committed play diverged from the anchored event baseline."
      : "Canon divergence: committed play contradicted a fixed baseline constraint.";

  anchor.progress = {
    status: input.status,
    updatedAtRevision: nextRevision,
    updatedAt: input.now,
    causalRefs: [...anchor.progress.causalRefs, ...input.causalRefs].slice(
      -MAX_HISTORICAL_CAUSAL_REFS,
    ),
    ...(input.reason?.trim()
      ? { reason: clampText(input.reason) }
      : input.status === "diverged"
        ? { reason: defaultDivergedReason }
        : {}),
  };
  next.revision = nextRevision;
  next.updatedAt = input.now;
  next.lastPlayedAt = input.now;

  try {
    return { ok: true, session: parseAdventureSession(next) };
  } catch {
    return {
      ok: false,
      reason: "state-budget-exceeded",
      message:
        "Updating historical anchor progress exceeds the session state budget.",
    };
  }
}
