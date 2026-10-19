import type { StatSheetField } from "schema";
import { BFRD_MANIFEST } from "./bfrd-manifest";
import { TOV_LUCK_FIXTURE } from "./fixtures/tov-luck.fixture";
import {
  TOV_CHARACTER_TEMPLATE_ID,
  TOV_MONSTER_TEMPLATE_ID,
  TOV_NPC_TEMPLATE_ID,
} from "./tov-templates";

/** The one canonical field id for Tales of the Valiant Luck on a sheet. */
export const TOV_LUCK_FIELD_ID = "luck" as const;

const TOV_TEMPLATE_IDS: ReadonlySet<string> = new Set([
  TOV_CHARACTER_TEMPLATE_ID,
  TOV_NPC_TEMPLATE_ID,
  TOV_MONSTER_TEMPLATE_ID,
]);

/** Concise in-context rules reference, with the pinned source recorded. */
export const TOV_LUCK_REFERENCE = {
  summary:
    "Luck is a pool of up to 5 points, starting at 0. Gain 1 when you miss an attack or fail a save; spend it 1-for-1 on a check, or 3 to reroll the d20.",
  earn: TOV_LUCK_FIXTURE.earnCondition,
  spend: TOV_LUCK_FIXTURE.spendCondition,
  overflow: TOV_LUCK_FIXTURE.overflowCondition,
  note: "Codex Cryptica never changes Luck for you. Adjust it yourself after each roll.",
  source: `${BFRD_MANIFEST.shortName} ${BFRD_MANIFEST.version} (${BFRD_MANIFEST.license})`,
} as const;

/**
 * True only for the Luck counter of a Tales of the Valiant sheet. Mythras
 * Luck (`lp`) and free-form counters named "luck" on other templates are
 * deliberately not matched.
 */
export function isTovLuckField(
  templateId: string | null | undefined,
  field: Pick<StatSheetField, "id" | "type">,
): boolean {
  return (
    !!templateId &&
    TOV_TEMPLATE_IDS.has(templateId) &&
    field.id === TOV_LUCK_FIELD_ID &&
    field.type === "counter"
  );
}

export interface TovLuckChange {
  /** The resulting Luck value after validation. */
  value: number;
  /** True when the request was not applied in full (cap, floor or invalid). */
  clamped: boolean;
  /** Plain-language explanation when `clamped` is true. */
  reason?: string;
}

/**
 * Applies an explicit Luck gain (positive) or spend (negative). Pure and
 * reversible: applying `-n` after `+n` restores the prior value unless the
 * cap or floor intervened, which is reported rather than hidden.
 */
export function adjustTovLuck(
  current: number,
  delta: number,
  max: number = TOV_LUCK_FIXTURE.defaultMax,
): TovLuckChange {
  const min = TOV_LUCK_FIXTURE.min;
  if (!Number.isInteger(delta) || delta === 0) {
    return {
      value: current,
      clamped: true,
      reason: "Luck changes by whole, non-zero amounts.",
    };
  }
  const requested = current + delta;
  if (delta > 0 && requested > max) {
    return {
      value: Math.max(current, max),
      clamped: true,
      reason: `Luck cannot go above ${max}. Roll ${TOV_LUCK_FIXTURE.overflowResetFormula} and set Luck to the result.`,
    };
  }
  if (requested < min) {
    return {
      value: min,
      clamped: true,
      reason: `Only ${current} Luck available to spend.`,
    };
  }
  return { value: requested, clamped: false };
}
