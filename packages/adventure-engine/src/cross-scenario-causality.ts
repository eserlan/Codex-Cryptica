import {
  appendScenarioEvent,
  type ScenarioCommandResult,
} from "./scenario-collection";
import type { AdventureSession } from "./types";

/** A reviewed, committed consequence that should affect a related situation. */
export interface CrossScenarioConsequence {
  sourceScenarioId: string;
  sourceEventId: string;
  targetScenarioId: string;
  /** Existing Vault entity shared explicitly by both scenarios. */
  anchorRef: string;
  eventId: string;
  text: string;
  at: string;
}

/**
 * Cross-scenario propagation is opt-in and causal, never an LLM's guess.
 * This first stage routes observable consequences only between already-known
 * situations; GM-only proposals require a separate approval/disclosure path.
 */
export function propagateKnownConsequence(
  session: AdventureSession,
  proposal: CrossScenarioConsequence,
  expectedRevision: number,
): ScenarioCommandResult {
  if (session.revision !== expectedRevision) {
    return { ok: false, reason: "stale-revision" };
  }
  if (proposal.sourceScenarioId === proposal.targetScenarioId) {
    return { ok: false, reason: "invalid-scenario" };
  }
  const scenarios = session.scenarioCollection?.items ?? [];
  const source = scenarios.find(
    (item) => item.id === proposal.sourceScenarioId,
  );
  const target = scenarios.find(
    (item) => item.id === proposal.targetScenarioId,
  );
  if (!source || !target) return { ok: false, reason: "unknown-scenario" };
  if (target.knowledge !== "heard") {
    return { ok: false, reason: "scenario-not-heard" };
  }
  if (target.status !== "open") {
    return { ok: false, reason: "invalid-transition" };
  }

  // The caller must identify a real, committed, player-observable source and
  // its concrete shared entity. Similar text is never sufficient causation.
  const sourceEvent = source.events.find(
    (event) => event.id === proposal.sourceEventId,
  );
  if (
    source.knowledge !== "heard" ||
    !sourceEvent ||
    sourceEvent.visibility !== "player" ||
    sourceEvent.kind !== "consequence" ||
    !proposal.anchorRef ||
    !source.anchorRefs.includes(proposal.anchorRef) ||
    !target.anchorRefs.includes(proposal.anchorRef)
  ) {
    return { ok: false, reason: "invalid-scenario" };
  }

  return appendScenarioEvent(
    session,
    target.id,
    {
      id: proposal.eventId,
      kind: "consequence",
      visibility: "player",
      text: proposal.text,
      at: proposal.at,
      causedBy: {
        scenarioId: source.id,
        eventId: sourceEvent.id,
        anchorRef: proposal.anchorRef,
      },
    },
    expectedRevision,
    proposal.at,
  );
}
