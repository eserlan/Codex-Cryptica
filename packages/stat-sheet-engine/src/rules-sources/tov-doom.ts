import type { StatSheetField } from "schema";
import { BFRD_MANIFEST } from "./bfrd-manifest";
import { TOV_MONSTER_TEMPLATE_ID } from "./tov-templates";

/**
 * The one canonical field id for Tales of the Valiant Doom Points on a creature sheet.
 * Represents per-creature allocations tracked from the optional BFRD encounter-level Doom pool.
 */
export const TOV_DOOM_FIELD_ID = "doom" as const;

/** Concise in-context rules reference for Doom Points. */
export const TOV_DOOM_REFERENCE = {
  summary:
    "The optional BFRD Doom rule gives the GM a CR-based resource at the start of an encounter. The GM can spend it to give a creature advantage on an attack, give a PC disadvantage on a save, or once per encounter refresh, recharge, or gain one additional use of a limited-use feature.",
  min: 0,
  defaultMax: 10,
  note: "The published rule is encounter-level and can affect creatures in that encounter. Codex Cryptica currently exposes a counter on an individual ToV monster stat sheet as a tracking choice.",
  allocationGuidance:
    "Use the per-creature Doom counter on a ToV monster sheet or VTT token to track points allocated to that creature from the encounter's Doom pool; this storage model does not change the encounter-level BFRD rule.",
  source: `${BFRD_MANIFEST.shortName} ${BFRD_MANIFEST.version} (${BFRD_MANIFEST.license})`,
} as const;

/**
 * True only for the Doom counter of a Tales of the Valiant monster sheet.
 * Deliberately not matched for non-ToV sheets or non-counter fields.
 * The counter stores points allocated to a creature from the encounter's Doom pool.
 */
export function isTovDoomField(
  templateId: string | null | undefined,
  field: Pick<StatSheetField, "id" | "type">,
): boolean {
  return (
    !!templateId &&
    templateId === TOV_MONSTER_TEMPLATE_ID &&
    field.id === TOV_DOOM_FIELD_ID &&
    field.type === "counter"
  );
}

export interface TovDoomChange {
  /** The resulting Doom value after validation. */
  value: number;
  /** True when the request was not applied in full (cap, floor or invalid). */
  clamped: boolean;
  /** Plain-language explanation when `clamped` is true. */
  reason?: string;
}

/**
 * Applies an explicit Doom gain (positive) or spend (negative). Pure and
 * reversible within [0, max].
 */
export function adjustTovDoom(
  current: number,
  delta: number,
  max: number = TOV_DOOM_REFERENCE.defaultMax,
): TovDoomChange {
  if (!Number.isFinite(current)) {
    return {
      value: 0,
      clamped: true,
      reason: "Current Doom value is not a valid number; reset to 0.",
    };
  }
  const next = current + delta;
  if (next < 0) {
    return {
      value: 0,
      clamped: true,
      reason: "Doom Points cannot fall below 0.",
    };
  }
  if (next > max) {
    return {
      value: max,
      clamped: true,
      reason: `Doom Points cannot exceed ${max}.`,
    };
  }
  return {
    value: next,
    clamped: false,
  };
}
