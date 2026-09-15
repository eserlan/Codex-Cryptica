import type { DiceEngine } from "dice-engine";
import type { Entity } from "schema";
import { bandMagnitude } from "./bands";
import { deriveLastTurnDate, mostRecentActive } from "./history";
import { buildTemplateNarrative } from "./narrative";
import { buildChanges, computeStateHash, findHold } from "./patches";
import { applyAiBand, resolveInfluence } from "./resolution";
import type {
  AiBandProposal,
  CommitFailure,
  CommitPlan,
  FactionTurnProposal,
  FactionTurnRecord,
  ResolveFailure,
  ResolveInput,
  Result,
} from "./types";

/**
 * The faction turn facade.
 *
 * `commit` and `reverse` return **plans**, never mutations. The store applies
 * them through `EntityMutationService` so the inbound-map and graph callbacks
 * fire, and so this package stays free of storage, network and DOM — which is
 * what keeps the reversibility matrix cheap to test (Constitution I, VIII).
 */

export interface FactionTurnEngineDeps {
  dice?: DiceEngine;
  /** Injected for deterministic ids and timestamps in tests. */
  now?: () => number;
  newId?: () => string;
}

export interface ProposeOptions {
  ai?: AiBandProposal | null;
  aiNarrative?: string | null;
  optIntoTypeChange?: boolean;
  isOverride?: boolean;
}

export class FactionTurnEngine {
  constructor(private deps: FactionTurnEngineDeps = {}) {}

  private now(): number {
    return this.deps.now?.() ?? Date.now();
  }

  private newId(): string {
    return (
      this.deps.newId?.() ??
      `turn_${this.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    );
  }

  /**
   * Resolve an action and package it for review. Writes nothing (FR-022).
   */
  propose(
    input: ResolveInput,
    options: ProposeOptions = {},
  ): Result<FactionTurnProposal, ResolveFailure> {
    const resolved = resolveInfluence(input, { dice: this.deps.dice });
    if (!resolved.ok) return resolved;

    const resolution = applyAiBand(resolved.value, options.ai ?? null);
    const optIn = options.optIntoTypeChange ?? false;
    const { changes, inverse, suggestedTypeChange } = buildChanges(
      input.faction,
      input.target,
      resolution,
      optIn,
    );

    // AI narration is used only when it actually arrived; otherwise the local
    // template stands. This is why a turn can never be blocked by AI being
    // unavailable (FR-021d).
    const aiNarrative = options.aiNarrative?.trim();
    const narrative =
      aiNarrative && aiNarrative.length > 0
        ? aiNarrative
        : buildTemplateNarrative(
            resolution,
            input.faction.title,
            input.target.title,
          );

    return {
      ok: true,
      value: {
        factionId: input.faction.id,
        targetId: input.target.id,
        // Snapshotted so the record stays readable after the target is deleted.
        targetTitle: input.target.title,
        action: "influence",
        worldDate: input.worldDate,
        resolution,
        changes,
        inverse,
        narrative,
        narrativeSource:
          aiNarrative && aiNarrative.length > 0 ? "ai" : "template",
        suggestedTypeChange,
        stateHash: computeStateHash(input.faction, input.target),
        isOverride: options.isOverride ?? false,
      },
    };
  }

  /**
   * Turn a reviewed proposal into a plan of writes.
   *
   * Refuses rather than overwriting when the world moved underneath the preview
   * (FR-026, SC-007) — the GM is offered a re-resolve instead of a silent stomp.
   */
  commit(
    proposal: FactionTurnProposal,
    faction: Entity,
    target: Entity | undefined,
  ): Result<CommitPlan, CommitFailure> {
    if (!target) {
      return {
        ok: false,
        errors: {
          kind: "target-missing",
          message: `${proposal.targetTitle} no longer exists, so this turn cannot be applied.`,
        },
      };
    }

    if (computeStateHash(faction, target) !== proposal.stateHash) {
      return {
        ok: false,
        errors: {
          kind: "stale",
          message:
            "This faction or its target changed since the outcome was rolled. Resolve again to see the current result.",
        },
      };
    }

    const record: FactionTurnRecord = {
      id: this.newId(),
      worldDate: proposal.worldDate,
      committedAt: this.now(),
      action: "influence",
      targetId: proposal.targetId,
      targetTitle: proposal.targetTitle,
      resolution: proposal.resolution,
      changes: proposal.changes,
      inverse: proposal.inverse,
      narrative: proposal.narrative,
      narrativeSource: proposal.narrativeSource,
      isOverride: proposal.isOverride,
      undone: false,
    };

    const history = [...(faction.factionTurn?.history ?? []), record];

    return {
      ok: true,
      value: {
        ...planFromChanges(faction, proposal.changes),
        record,
        lastTurnDate: deriveLastTurnDate(history),
      },
    };
  }

  /**
   * Reverse the most recent committed turn.
   *
   * Only the most recent (FR-028): reversing an older turn would have to
   * reconcile every change made since, and a wrong guess there corrupts a vault
   * the GM authored by hand.
   */
  reverse(
    record: FactionTurnRecord,
    faction: Entity,
  ): Result<CommitPlan, CommitFailure> {
    const history = faction.factionTurn?.history ?? [];
    const newest = mostRecentActive(history);

    if (!newest || newest.id !== record.id) {
      return {
        ok: false,
        errors: {
          kind: "not-most-recent",
          message: "Only the most recent turn can be undone.",
        },
      };
    }

    const undone: FactionTurnRecord = { ...record, undone: true };
    const nextHistory = history.map((r) => (r.id === record.id ? undone : r));

    return {
      ok: true,
      value: {
        ...planFromChanges(faction, record.inverse),
        record: undone,
        lastTurnDate: deriveLastTurnDate(nextHistory),
      },
    };
  }
}

/**
 * Fold a change list into the concrete writes the store must perform.
 *
 * Stat updates collapse to a final value per field, and the connection writes
 * collapse to at most one create/update plus at most one removal — so applying a
 * plan is a small, ordered set of operations rather than a replay.
 */
function planFromChanges(
  faction: Entity,
  changes: CommitPlan["record"]["changes"],
): Omit<CommitPlan, "record" | "lastTurnDate"> {
  const statUpdates: CommitPlan["statUpdates"] = [];

  // Accumulated as separate primitives rather than a partially-built object:
  // reading fields back off a `T | null` inside a switch defeats TypeScript's
  // control-flow narrowing and the whole thing collapses to `never`.
  let targetId: string | undefined;
  let strength: number | undefined;
  let type: string | undefined;
  let create = false;
  let removeTargetId: string | undefined;

  for (const change of changes) {
    switch (change.kind) {
      case "stat-value":
        statUpdates.push({ fieldId: change.fieldId, value: change.to });
        break;
      case "connection-created":
        targetId = change.targetId;
        type = change.type;
        create = true;
        break;
      case "connection-strength":
        targetId = change.targetId;
        strength = change.to;
        if (change.from === null) create = true;
        break;
      case "connection-type":
        targetId = change.targetId;
        type = change.to;
        break;
      case "connection-removed":
        removeTargetId = change.targetId;
        break;
    }
  }

  // A removal and a write in the same plan would be contradictory. Removal wins,
  // since it only ever appears as the inverse of a creation.
  if (removeTargetId !== undefined) {
    return {
      statUpdates,
      connectionWrite: null,
      connectionRemove: { targetId: removeTargetId },
    };
  }

  if (targetId === undefined) {
    return { statUpdates, connectionWrite: null, connectionRemove: null };
  }

  return {
    statUpdates,
    connectionWrite: {
      targetId,
      // A type-only change leaves strength untouched, so fall back to whatever
      // the faction already holds rather than resetting it to zero.
      strength: strength ?? findHold(faction, targetId)?.strength ?? 0,
      type,
      create,
    },
    connectionRemove: null,
  };
}

/** Shared singleton alongside the class, per Constitution VIII. */
export const factionTurnEngine = new FactionTurnEngine();

export { bandMagnitude };
