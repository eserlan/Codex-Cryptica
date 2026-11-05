import type {
  AdventureSession,
  ScenarioEvent,
  ScenarioItem,
  ScenarioSeed,
  ScenarioState,
  ScenarioStatus,
} from "./types";
import { parseAdventureSession, scenarioEventSchema } from "./schemas";

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

/** Only explicitly observable events and lead text cross the UI boundary. */
export function playerScenarioProjection(
  scenario: ScenarioState | ScenarioItem,
) {
  if ("knowledge" in scenario && scenario.knowledge !== "heard")
    return undefined;
  return {
    version: scenario.version,
    id: scenario.id,
    origin: {
      kind: scenario.origin.kind,
      // A source record may be GM-only; do not expose its ID or provenance.
    },
    playerVisible: structuredClone(scenario.playerVisible),
    status: scenario.status,
    events: scenario.events
      .filter((event) => event.visibility === "player")
      .map(({ id, kind, text, at, turnId }) => ({
        id,
        kind,
        text,
        at,
        turnId,
      })),
  };
}

export function playerScenarioCollectionProjection(session: AdventureSession) {
  const collection = session.scenarioCollection;
  if (!collection) return { items: [], focusedScenarioId: null };
  const items = collection.items
    .filter((item) => item.knowledge === "heard")
    .map((item) => playerScenarioProjection(item));
  return {
    items,
    focusedScenarioId: items.some(
      (item) => item?.id === collection.focusedScenarioId,
    )
      ? collection.focusedScenarioId
      : null,
  };
}

export type ScenarioCommitResult =
  | { ok: true; session: AdventureSession }
  | {
      ok: false;
      reason:
        | "no-scenario"
        | "stale-revision"
        | "duplicate-event"
        | "invalid-transition"
        | "invalid-event"
        | "state-budget-exceeded";
    };

/**
 * Commit one bounded causal change. The caller must still use the existing
 * revision-checked AdventureSessionRepository.save() transaction boundary.
 */
export function commitScenarioEvent(
  session: AdventureSession,
  event: ScenarioEvent,
  nextStatus: ScenarioStatus,
  expectedRevision: number,
  secretBindingId?: string,
): ScenarioCommitResult {
  const focusedId = session.scenarioCollection?.focusedScenarioId;
  const scenario = session.scenarioCollection?.items.find(
    (item) => item.id === focusedId,
  );
  if (!scenario) return { ok: false, reason: "no-scenario" };
  if (session.revision !== expectedRevision)
    return { ok: false, reason: "stale-revision" };
  if (session.status !== "active" || scenario.status !== "open") {
    return { ok: false, reason: "invalid-transition" };
  }
  if (
    !["open", "resolved", "abandoned"].includes(nextStatus) ||
    !Number.isFinite(Date.parse(event.at))
  ) {
    return { ok: false, reason: "invalid-event" };
  }
  // Validate the event on its own first, so a field-limit failure is reported
  // as an invalid event rather than as an exhausted state budget. The parsed
  // event is canonical (trimmed IDs), so duplicates are compared as persisted.
  const parsedEvent = scenarioEventSchema.safeParse(event);
  if (!parsedEvent.success || !parsedEvent.data.text.trim()) {
    return { ok: false, reason: "invalid-event" };
  }
  const canonicalEvent = parsedEvent.data as ScenarioEvent;
  if (canonicalEvent.visibility === "gm" && !secretBindingId) {
    return { ok: false, reason: "invalid-event" };
  }
  if (
    session.scenarioCollection!.items.some((item) =>
      item.events.some((item) => item.id.trim() === canonicalEvent.id),
    )
  ) {
    return { ok: false, reason: "duplicate-event" };
  }
  const candidate = structuredClone(session);
  const candidateScenario = candidate.scenarioCollection!.items.find(
    (item) => item.id === focusedId,
  )!;
  candidateScenario.events.push(structuredClone(canonicalEvent));
  if (secretBindingId)
    Object.defineProperty(
      candidateScenario.secretBindings.eventIds,
      canonicalEvent.id,
      {
        value: secretBindingId,
        enumerable: true,
        configurable: true,
        writable: true,
      },
    );
  candidateScenario.status = nextStatus;
  if (nextStatus !== "open")
    candidate.scenarioCollection!.focusedScenarioId = null;
  candidate.revision += 1;
  candidate.updatedAt = canonicalEvent.at;
  candidate.lastPlayedAt = canonicalEvent.at;
  // The event itself is valid, so a parse failure here means the bounded
  // event history or serialised state budget is full. Nothing is truncated.
  try {
    return { ok: true, session: parseAdventureSession(candidate) };
  } catch {
    return { ok: false, reason: "state-budget-exceeded" };
  }
}
