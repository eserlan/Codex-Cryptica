import type {
  AdventureSession,
  TimeAdvanceProposal,
  WorldTimeState,
} from "./types";
import { scenarioEventSecretId } from "./hidden-state";

/** Short, player-safe duration relative to the adventure's start. */
export function formatWorldElapsedMinutes(minutes: number): string {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts = [
    days ? `${days}d` : "",
    hours ? `${hours}h` : "",
    mins ? `${mins}m` : "",
  ];
  return parts.filter(Boolean).join(" ") || "0m";
}

export interface TriggeredScenarioPressureEvent {
  scenarioId: string;
  scenarioIndex: number;
  eventId: string;
  secretId: string;
  text: string;
}

export type ScenarioTimePressureResult =
  | { ok: true; events: TriggeredScenarioPressureEvent[] }
  | { ok: false; reason: "state-budget-exceeded" };

/**
 * Deterministically trigger eligible open scenario pressures whose fictional
 * time threshold has arrived, firing at most once.
 */
export function applyScenarioTimePressures(
  session: AdventureSession,
  elapsedMinutes: number,
  turnOrEventId: string,
  now: string,
): ScenarioTimePressureResult {
  const items = session.scenarioCollection?.items ?? [];
  const eligible = items.flatMap((scenario, index) =>
    scenario.status === "open" &&
    scenario.pressure?.triggerAfterMinutes !== undefined &&
    elapsedMinutes >= scenario.pressure.triggerAfterMinutes &&
    scenario.pressure.triggeredAtMinute === undefined
      ? [{ scenario, index }]
      : [],
  );
  if (eligible.some(({ scenario }) => scenario.events.length >= 100)) {
    return { ok: false, reason: "state-budget-exceeded" };
  }

  const triggered: TriggeredScenarioPressureEvent[] = [];
  for (const { scenario, index } of eligible) {
    if (
      scenario.status === "open" &&
      scenario.pressure?.triggerAfterMinutes !== undefined &&
      elapsedMinutes >= scenario.pressure.triggerAfterMinutes &&
      scenario.pressure.triggeredAtMinute === undefined
    ) {
      scenario.pressure.triggeredAtMinute = elapsedMinutes;
      const eventId = `${turnOrEventId.slice(0, 130)}:pressure:${index}`;
      const secretId = scenarioEventSecretId(eventId);
      scenario.events.push({
        id: eventId,
        kind: "consequence",
        visibility: "gm",
        text: scenario.pressure.expectedConsequence,
        at: now,
        turnId: turnOrEventId,
      });
      scenario.secretBindings.eventIds[eventId] = secretId;
      triggered.push({
        scenarioId: scenario.id,
        scenarioIndex: index,
        eventId,
        secretId,
        text: scenario.pressure.expectedConsequence,
      });
    }
  }
  return { ok: true, events: triggered };
}

/** Advance only from a committed fictional action, never the device clock. */
export function applyTimeAdvance(
  session: AdventureSession,
  advance: TimeAdvanceProposal | undefined,
  turnId: string,
):
  | { ok: true; value: WorldTimeState | undefined }
  | { ok: false; reason: string } {
  if (!advance) return { ok: true, value: session.worldTime };
  if (
    session.status !== "active" ||
    !Number.isSafeInteger(advance.minutes) ||
    advance.minutes < 1 ||
    advance.minutes > 43_200 ||
    !advance.cause.trim() ||
    advance.developments.length > 3
  ) {
    return { ok: false, reason: "invalid-fictional-time" };
  }
  const previous = session.worldTime ?? {
    version: 1 as const,
    elapsedMinutes: 0,
    events: [],
  };
  const elapsedMinutes = previous.elapsedMinutes + advance.minutes;
  if (elapsedMinutes > 52_560_000) {
    return { ok: false, reason: "fictional-time-limit-exceeded" };
  }
  const knownGmThreads = new Set(
    session.hiddenState.gmThreads.map((thread) => thread.id),
  );
  const knownScenarios = new Set(
    (session.scenarioCollection?.items ?? [])
      .filter((item) => item.status === "open")
      .map((item) => item.id),
  );
  const isKnownThread = (threadId: string) =>
    knownGmThreads.has(threadId) || knownScenarios.has(threadId);

  const seen = new Set<string>();
  for (const change of advance.developments) {
    if (
      !isKnownThread(change.threadId) ||
      seen.has(change.threadId) ||
      !change.text.trim() ||
      change.text.length > 600
    ) {
      return { ok: false, reason: "unknown-or-duplicate-background-thread" };
    }
    seen.add(change.threadId);
  }
  // Keep only recent events. Historical outcomes already live in the
  // corresponding GM threads, so lengthy adventures can continue advancing.
  return {
    ok: true,
    value: {
      version: 1,
      elapsedMinutes,
      events: [
        ...previous.events,
        ...advance.developments.map((item, index) => ({
          id: `${turnId.slice(0, 140)}:world:${index + 1}`,
          turnId,
          atMinute: elapsedMinutes,
          threadId: item.threadId,
          text: item.text,
        })),
      ].slice(-80),
    },
  };
}
