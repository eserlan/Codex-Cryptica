import type { Connection, Entity } from "schema";
// Deep import, never the package barrel: `@codex/oracle-engine`'s index
// re-exports oracle-settings.svelte, chat-history.svelte and undo-redo.svelte,
// which would pull Svelte runes into this package. faction-engine is compiled
// and tested without the Svelte compiler, so that import would break `bun test`
// and quietly violate the package's rune-free guarantee.
import { entityContentHash } from "@codex/oracle-engine/src/lore-delta";
import { bandMagnitude } from "./bands";
import { resolveRole } from "./roles";
import type { FactionResolution, FactionTurnChange } from "./types";

/**
 * Turning a resolved outcome into a reversible set of changes.
 *
 * Every forward change has an exact inverse, and the inverse always carries the
 * *true* prior value — including when the forward change was clamped at a bound
 * (FR-034a). Clamping to a maximum and then "reversing" to that maximum would
 * silently ratchet a stat upward over repeated turns.
 */

/** Relationship strength is bounded 0..1 by the connection model. */
const STRENGTH_MIN = 0;
const STRENGTH_MAX = 1;

function clamp(
  value: number,
  min: number | undefined,
  max: number | undefined,
): { value: number; clamped: boolean } {
  let next = value;
  if (typeof min === "number" && next < min) next = min;
  if (typeof max === "number" && next > max) next = max;
  return { value: next, clamped: next !== value };
}

/** The acting faction's outgoing edge to the target, if one exists. */
export function findHold(
  faction: Entity,
  targetId: string,
): Connection | undefined {
  return faction.connections?.find((c) => c.target === targetId);
}

export interface BuildChangesResult {
  changes: FactionTurnChange[];
  inverse: FactionTurnChange[];
  /** Offered to the GM, never applied automatically (FR-032b). */
  suggestedTypeChange?: string;
}

export function buildChanges(
  faction: Entity,
  target: Entity,
  resolution: FactionResolution,
  optIntoTypeChange: boolean,
): BuildChangesResult {
  const magnitude = bandMagnitude(resolution.finalBand);
  const changes: FactionTurnChange[] = [];
  const inverse: FactionTurnChange[] = [];

  // --- The acting faction's influence stat -------------------------------
  const acting = resolveRole(faction, "influence");
  if (acting.mapped && magnitude.stat !== 0) {
    const raw = acting.value + magnitude.stat;
    const { value, clamped } = clamp(raw, acting.min, acting.max);
    if (value !== acting.value) {
      changes.push({
        kind: "stat-value",
        fieldId: acting.fieldId,
        from: acting.value,
        to: value,
        clamped,
      });
      // Inverse restores the value actually held before the turn, not the
      // clamped ceiling (FR-034a).
      inverse.push({
        kind: "stat-value",
        fieldId: acting.fieldId,
        from: value,
        to: acting.value,
        clamped: false,
      });
    }
  }

  // --- The single directed edge, faction -> target ------------------------
  // Only this direction is ever written (FR-032c). A relationship the GM
  // authored pointing the other way means something else and is left alone.
  const existing = findHold(faction, target.id);
  const priorStrength = existing ? (existing.strength ?? 0) : null;
  const rawStrength = (priorStrength ?? 0) + magnitude.strength;
  const { value: nextStrength, clamped: strengthClamped } = clamp(
    rawStrength,
    STRENGTH_MIN,
    STRENGTH_MAX,
  );

  if (!existing) {
    // FR-033: create at neutral. Neutral rather than friendly because the
    // system must not invent a stance the GM never expressed.
    changes.push({
      kind: "connection-created",
      targetId: target.id,
      type: "neutral",
    });
    changes.push({
      kind: "connection-strength",
      targetId: target.id,
      from: null,
      to: nextStrength,
      clamped: strengthClamped,
    });
    inverse.push({ kind: "connection-removed", targetId: target.id });
  } else if (nextStrength !== priorStrength) {
    changes.push({
      kind: "connection-strength",
      targetId: target.id,
      from: priorStrength,
      to: nextStrength,
      clamped: strengthClamped,
    });
    inverse.push({
      kind: "connection-strength",
      targetId: target.id,
      from: nextStrength,
      to: priorStrength ?? 0,
      clamped: false,
    });
  }

  // --- Relationship type, only on explicit opt-in -------------------------
  const suggestedTypeChange = suggestType(resolution, existing);
  if (optIntoTypeChange && suggestedTypeChange && existing) {
    changes.push({
      kind: "connection-type",
      targetId: target.id,
      from: existing.type,
      to: suggestedTypeChange,
    });
    inverse.push({
      kind: "connection-type",
      targetId: target.id,
      from: suggestedTypeChange,
      to: existing.type,
    });
  }

  return { changes, inverse, suggestedTypeChange };
}

/**
 * What type change, if any, the outcome hints at.
 *
 * Only ever a suggestion. The system never changes a relationship's type on its
 * own (FR-032b) — silently flipping a hand-authored "enemy" into "friendly" is
 * exactly the kind of stomp that made review and reversal P1.
 */
function suggestType(
  resolution: FactionResolution,
  existing: Connection | undefined,
): string | undefined {
  if (!existing) return undefined;
  if (
    resolution.finalBand === "decisive-success" &&
    existing.type === "neutral"
  ) {
    return "friendly";
  }
  if (resolution.finalBand === "backfire" && existing.type === "neutral") {
    return "enemy";
  }
  return undefined;
}

/**
 * A fingerprint of everything this turn depends on, checked again at commit.
 *
 * Scoped deliberately to the touched values rather than the whole entity: an
 * unrelated edit elsewhere on the faction (renaming it, adding lore) must not
 * invalidate a preview the GM is still reading (FR-026, SC-007).
 */
export function computeStateHash(faction: Entity, target: Entity): string {
  const acting = resolveRole(faction, "influence");
  const hold = findHold(faction, target.id);
  const parts = [
    faction.id,
    target.id,
    acting.mapped ? `${acting.fieldId}:${acting.value}` : "unmapped",
    hold ? `${hold.type}:${hold.strength ?? 0}` : "none",
    // The target's stability matters only when it is itself turn-enabled, but
    // including it unconditionally is harmless and keeps the hash total.
    target.factionTurn?.enabled
      ? String(resolveRole(target, "stability").mapped)
      : "n/a",
  ];
  return entityContentHash(parts.join("|"));
}
