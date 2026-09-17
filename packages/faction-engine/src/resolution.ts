import { DiceEngine, diceEngine as defaultDice } from "dice-engine";
import { bandForTotal, permittedBands } from "./bands";
import { computeOpposition } from "./opposition";
import { missingRoles, resolveRole } from "./roles";
import type {
  AiBandProposal,
  FactionResolution,
  ResolveFailure,
  ResolveInput,
  Result,
} from "./types";

/**
 * Resolving one Influence action.
 *
 * The division of labour here is the heart of the feature: **dice supply
 * calibrated randomness, rules map it to a band, and AI may only nudge that band
 * one step**. Dice are excellent at odds and terrible at judgement; a language
 * model is the reverse. Neither is asked to do the other's job.
 *
 * Returns a `Result` rather than throwing, because "you have not mapped an
 * Influence stat yet" is a message to the GM (FR-005), not an exception.
 */

/** Influence uses the acting faction's influence role (FR-019a). */
const INFLUENCE_ROLL = "1d10";

export interface ResolveDeps {
  dice?: DiceEngine;
}

export function resolveInfluence(
  input: ResolveInput,
  deps: ResolveDeps = {},
): Result<FactionResolution, ResolveFailure> {
  const { faction, target, allFactions, settings } = input;

  if (faction.id === target.id) {
    return {
      ok: false,
      errors: {
        kind: "self-target",
        message: "A faction cannot influence itself.",
      },
    };
  }

  // Only the roles this action actually uses are required (FR-005). Requiring
  // all four would block a GM who never modelled military power.
  const missing = missingRoles(faction, ["influence"]);
  if (missing.length > 0) {
    return {
      ok: false,
      errors: {
        kind: "role-unmapped",
        role: missing[0],
        message: `Map a stat to the influence role before ${faction.title} can act.`,
      },
    };
  }

  const acting = resolveRole(faction, "influence");
  /* c8 ignore next 3 -- missingRoles already guarantees this is mapped; the
     guard exists only to narrow the union for TypeScript. */
  if (!acting.mapped) {
    return {
      ok: false,
      errors: { kind: "role-unmapped", role: "influence", message: "" },
    };
  }

  const opposition = computeOpposition(
    target,
    allFactions,
    faction.id,
    settings,
  );

  // With randomness off the dice engine is not called at all, which is what
  // makes the deterministic mode genuinely reproducible (FR-019, SC-006).
  let roll: FactionResolution["roll"] = null;
  let actingTotal = acting.value;
  let opposingTotal = opposition.value;

  if (settings.useRandomness) {
    const dice = deps.dice ?? defaultDice;

    // Opposed: both sides roll. Rolling for only the acting side skews every
    // matchup toward it — an evenly matched pair would succeed essentially
    // always, and a faction could never lose ground to an equal rival.
    // `evaluate` parses and rolls in one step; `roll` takes a pre-parsed command.
    const actingRoll = dice.evaluate(INFLUENCE_ROLL);
    const opposingRoll = dice.evaluate(INFLUENCE_ROLL);

    roll = {
      formula: `${actingRoll.formula} vs ${opposingRoll.formula}`,
      total: actingRoll.total,
      dice: actingRoll.parts.flatMap((part) => part.rolls ?? []),
      opposingTotal: opposingRoll.total,
      opposingDice: opposingRoll.parts.flatMap((part) => part.rolls ?? []),
    };
    actingTotal = acting.value + actingRoll.total;
    opposingTotal = opposition.value + opposingRoll.total;
  }

  const mechanicalBand = bandForTotal(actingTotal, opposingTotal);

  return {
    ok: true,
    value: {
      actingRole: "influence",
      actingFieldId: acting.fieldId,
      // Snapshotted so a later rename does not retroactively reinterpret this
      // turn's history.
      actingLabel: acting.label,
      actingValue: acting.value,
      opposingValue: opposingTotal,
      oppositionSource: opposition.source,
      oppositionDetail: opposition.detail,
      modifiers: [],
      roll,
      total: actingTotal,
      mechanicalBand,
      permittedBands: permittedBands(mechanicalBand),
      finalBand: mechanicalBand,
      aiUsed: false,
    },
  };
}

/**
 * Apply an AI band choice, if it is one the mechanics permitted.
 *
 * **This is the single enforcement point for FR-021a's range and FR-021e's value
 * boundary.** A provider response schema can constrain `band` to the five ids,
 * but it cannot express "within one band of a value computed this turn" — that
 * range is per-turn data, not a static schema. Nor can a schema stop a model
 * returning extra fields; this function simply never reads them.
 *
 * Every rejection path is silent and benign (FR-021c): the mechanical band
 * stands and the turn resolves. A model declining to move the band, returning
 * nonsense, or timing out are all the same non-event from the GM's side.
 */
export function applyAiBand(
  resolution: FactionResolution,
  proposal: AiBandProposal | null,
): FactionResolution {
  if (!proposal) return resolution;

  const { band, reason } = proposal;

  // A band change without a stated reason is rejected: FR-035a keeps the reason
  // in history so the outcome stays explainable years later, and a change we
  // cannot explain is worse than no change.
  if (typeof reason !== "string" || reason.trim().length === 0) {
    return resolution;
  }

  if (!resolution.permittedBands.includes(band)) return resolution;

  // The model agreeing with the mechanics is not "AI used" in any sense the GM
  // would care about, and marking it so would put a redundant reason in history.
  if (band === resolution.mechanicalBand) return resolution;

  return {
    ...resolution,
    finalBand: band,
    aiUsed: true,
    aiReason: reason.trim(),
  };
}
