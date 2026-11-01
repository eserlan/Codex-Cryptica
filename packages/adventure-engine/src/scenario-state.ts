import type { AdventureSession, ScenarioEvent, ScenarioSeed, ScenarioState, ScenarioStatus } from "./types";
import { parseAdventureSession } from "./schemas";

/**
 * A scenario is a situation, not a quest. The player may leave, resolve it
 * quietly, or pursue other things without ending their Adventure session.
 */
export function createScenarioState(seed: ScenarioSeed): ScenarioState {
  return {
    version: 1,
    id: seed.id,
    origin: structuredClone(seed.origin),
    playerVisible: structuredClone(seed.playerVisible),
    gmOnly: structuredClone(seed.gmOnly),
    status: "open",
    events: [],
  };
}

/** Only explicitly observable events/lead text cross the UI boundary. */
export function playerScenarioProjection(scenario: ScenarioState) {
  return {
    version: scenario.version,
    id: scenario.id,
    origin: {
      kind: scenario.origin.kind,
      // Source record may be a GM-only note; do not expose its ID or batch provenance.
    },
    playerVisible: structuredClone(scenario.playerVisible),
    status: scenario.status,
    events: scenario.events
      .filter((event) => event.visibility === "player")
      .map(({ id, kind, text, at, turnId }) => ({ id, kind, text, at, turnId })),
  };
}

export type ScenarioCommitResult =
  | { ok: true; session: AdventureSession }
  | { ok: false; reason: "no-scenario" | "stale-revision" | "duplicate-event" | "invalid-transition" | "invalid-event" | "state-budget-exceeded" };

/**
 * Commit one bounded causal change. The caller must still use the existing
 * revision-checked AdventureSessionRepository.save() transaction boundary.
 */
export function commitScenarioEvent(
  session: AdventureSession,
  event: ScenarioEvent,
  nextStatus: ScenarioStatus,
  expectedRevision: number,
): ScenarioCommitResult {
  if (!session.scenarioState) return { ok: false, reason: "no-scenario" };
  if (session.revision !== expectedRevision) return { ok: false, reason: "stale-revision" };
  if (session.status !== "active" || session.scenarioState.status !== "open") {
    return { ok: false, reason: "invalid-transition" };
  }
  if (session.scenarioState.events.some((item) => item.id === event.id)) {
    return { ok: false, reason: "duplicate-event" };
  }
  if (!["open", "resolved", "abandoned"].includes(nextStatus) ||
      !Number.isFinite(Date.parse(event.at)) ||
      !event.id.trim() || !event.text.trim()) {
    return { ok: false, reason: "invalid-event" };
  }
  const candidate = structuredClone(session);
  candidate.scenarioState!.events.push(structuredClone(event));
  candidate.scenarioState!.status = nextStatus;
  candidate.revision += 1;
  candidate.updatedAt = event.at;
  candidate.lastPlayedAt = event.at;
  // Parsing validates size/bounds and the strict scenario schema, without
  // silently truncating history or ever committing a partially valid event.
  try {
    return { ok: true, session: parseAdventureSession(candidate) };
  } catch {
    return { ok: false, reason: "state-budget-exceeded" };
  }
}
