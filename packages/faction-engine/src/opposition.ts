import type { Entity } from "schema";
import { resolveRole } from "./roles";
import type { FactionTurnSettings, OppositionSource } from "./types";

/**
 * What an Influence attempt is resolved against (FR-020).
 *
 * Three tiers, checked in order:
 *   a. the target is itself turn-enabled -> its stability
 *   b. other factions already hold the target -> derived from that hold
 *   c. nobody holds it -> the vault baseline, exactly
 *
 * Tier (b) is what makes the GM's authored world matter: prising a province out
 * of a rival's grip is harder than walking into an unclaimed one.
 */

export interface OppositionResult {
  value: number;
  source: OppositionSource;
  /** Human-readable provenance, shown in the breakdown (FR-018). */
  detail: string;
}

/**
 * How much a fully-held target adds on top of the baseline.
 *
 * Tuning surface, like the band magnitudes — the spec fixes only that
 * opposition must rise with the strength of an existing hold (FR-020b).
 */
const MAX_HOLD_BONUS = 6;

/**
 * The strongest hold any *other* turn-enabled faction has on this target.
 *
 * Only relationships **directed at** the target count. A connection running the
 * other way — target -> faction — is something the GM authored to mean
 * something else entirely, and treating it as a hold would let an NPC's
 * admiration for a faction make that faction harder to influence.
 */
function strongestRivalHold(
  target: Entity,
  allFactions: Entity[],
  actingFactionId: string,
): { strength: number; holder: Entity } | null {
  let best: { strength: number; holder: Entity } | null = null;

  for (const faction of allFactions) {
    if (faction.id === actingFactionId) continue;
    if (!faction.factionTurn?.enabled) continue;

    for (const connection of faction.connections ?? []) {
      if (connection.target !== target.id) continue;
      const strength = connection.strength ?? 0;
      if (!best || strength > best.strength) {
        best = { strength, holder: faction };
      }
    }
  }

  return best;
}

export function computeOpposition(
  target: Entity,
  allFactions: Entity[],
  actingFactionId: string,
  settings: FactionTurnSettings,
): OppositionResult {
  // FR-020a — a turn-enabled faction resists with its own stability.
  const stability = resolveRole(target, "stability");
  if (target.factionTurn?.enabled && stability.mapped) {
    return {
      value: stability.value,
      source: "faction-stability",
      detail: `${target.title} resists with ${stability.label} (${stability.value}).`,
    };
  }

  // FR-020b — derived from whoever already holds it.
  const rival = strongestRivalHold(target, allFactions, actingFactionId);
  if (rival && rival.strength > 0) {
    const bonus = rival.strength * MAX_HOLD_BONUS;
    return {
      value: settings.baselineOpposition + bonus,
      source: "existing-hold",
      detail: `${rival.holder.title} already holds ${target.title}, which stiffens resistance.`,
    };
  }

  // FR-020c — held by nobody, so exactly the baseline. "Exactly" matters: an
  // unclaimed target must always be the easiest thing in the world to influence,
  // with nothing added on top.
  return {
    value: settings.baselineOpposition,
    source: "baseline",
    detail: `${target.title} is held by no faction.`,
  };
}
