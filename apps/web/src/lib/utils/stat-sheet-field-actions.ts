import type { StatSheetField } from "schema";
import { resolveFieldByKeyOrId } from "@codex/stat-sheet-engine";
import { mapSession } from "#lib/stores/map-session.svelte.js";
import { diceHistory } from "#lib/stores/dice-history.svelte.js";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { diceEngine, diceParser, type RollResult } from "dice-engine";

export interface DiceRollDisplay {
  text: string;
  isError: boolean;
  success?: boolean;
  total?: number;
  /** The engine's own trace, so the UI can show the dice as rolled. */
  roll?: RollResult;
}

/**
 * The dice as rolled, for the toast: " ([14] +3)". Empty when the engine
 * reports no individual dice, so the toast falls back to the total alone.
 */
function describeDice(result: RollResult): string {
  const parts = (result.parts ?? []).flatMap((part) => {
    if (part.type === "dice") {
      return part.rolls?.length ? [`[${part.rolls.join(", ")}]`] : [];
    }
    return part.value === 0
      ? []
      : [`${part.value > 0 ? "+" : "-"}${Math.abs(part.value)}`];
  });
  return parts.some((p) => p.startsWith("[")) ? ` (${parts.join(" ")})` : "";
}

export async function rollStatSheetDiceField(
  field: StatSheetField,
): Promise<DiceRollDisplay> {
  if (!field.formula) {
    return { text: "No formula set", isError: true };
  }
  try {
    const command = diceParser.parse(field.formula);
    const result = diceEngine.execute(command);
    await diceHistory.addResult(result, "modal", { label: field.label });

    const targetNum = typeof field.value === "number" ? field.value : undefined;

    if (targetNum !== undefined) {
      const isD100 = /d100/i.test(field.formula);
      let outcome = "Failure";
      let isSuccess = false;

      if (isD100) {
        const critThreshold = Math.max(1, Math.floor(targetNum / 10));
        if (result.total <= critThreshold) {
          outcome = "Critical Success";
          isSuccess = true;
        } else if (result.total <= targetNum) {
          outcome = "Success";
          isSuccess = true;
        } else if (result.total >= 99) {
          outcome = "Fumble";
          isSuccess = false;
        } else {
          outcome = "Failure";
          isSuccess = false;
        }
      } else {
        isSuccess = result.total <= targetNum;
        outcome = isSuccess ? "Success" : "Failure";
      }

      if (mapSession.vttEnabled) {
        mapSession.sendResolvedRollMessage(
          `${field.label} (${field.formula} vs ${targetNum} - ${outcome})`,
          result,
        );
      } else {
        notificationStore.notify(
          `${field.label}: ${field.formula} = ${result.total}${describeDice(result)}`,
          "info",
        );
      }

      return {
        text: `= ${result.total} vs ${targetNum} (${outcome})`,
        isError: false,
        success: isSuccess,
        total: result.total,
        roll: result,
      };
    }

    if (mapSession.vttEnabled) {
      mapSession.sendResolvedRollMessage(
        `${field.label}: ${field.formula}`,
        result,
      );
    } else {
      notificationStore.notify(
        `${field.label}: ${field.formula} = ${result.total}${describeDice(result)}`,
        "success",
      );
    }
    return {
      text: `= ${result.total}`,
      isError: false,
      total: result.total,
      roll: result,
    };
  } catch (e: any) {
    return { text: e?.message ?? "Invalid formula", isError: true };
  }
}

export function computeAdjustedCounterValue(
  field: StatSheetField,
  direction: 1 | -1,
): number {
  const step = field.step ?? 1;
  const current = typeof field.value === "number" ? field.value : 0;
  let next = current + step * direction;
  if (field.max !== undefined) next = Math.min(field.max, next);
  if (field.min !== undefined) next = Math.max(field.min, next);
  return next;
}

/** Standard D&D-style ability modifier: floor((score - 10) / 2). */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// Recomputes the flat modifier on every dice field that declares a
// `modifierSource` (e.g. "STR Check" sourced from a "STR" score field),
// keeping it in sync whenever the sheet's fields are persisted. Everything
// ahead of the *last* +/- is preserved as-is (so a customized base like
// "2d20kh1" or extra hand-added terms like "1d20+2" survive), only the
// trailing term is rewritten with the derived modifier.
export function applyDerivedModifiers(
  fields: StatSheetField[],
): StatSheetField[] {
  return fields.map((field) => {
    const mod = derivedModifier(fields, field);
    if (mod === null) return field;
    const nextFormula = withTrailingModifier(field.formula ?? "1d20", mod);
    return nextFormula === field.formula
      ? field
      : { ...field, formula: nextFormula };
  });
}

/**
 * Commit a formula the user typed on a derived dice field. Its last term is
 * the total they want, so the part that is not the derived modifier is kept
 * as its own term: "1d20+5" with STR 16 becomes "1d20+2+3". Without this the
 * next save rewrites it to "1d20+3" and a proficiency bonus is lost.
 */
export function applyTypedFormula(
  fields: StatSheetField[],
  fieldId: string,
): StatSheetField[] {
  return fields.map((field) => {
    if (field.id !== fieldId) return field;
    const mod = derivedModifier(fields, field);
    if (mod === null || !field.formula) return field;
    const nextFormula = keepTypedBonus(field.formula, mod);
    return nextFormula === field.formula
      ? field
      : { ...field, formula: nextFormula };
  });
}

/** The modifier a dice field derives from its source score, if any. */
function derivedModifier(
  fields: StatSheetField[],
  field: StatSheetField,
): number | null {
  if (field.type !== "dice" || !field.modifierSource) return null;
  // #3180: modifierSource accepts a field key or id; resolution ends at
  // the canonical field, so key renames never corrupt the derivation.
  const source = resolveFieldByKeyOrId(fields, field.modifierSource);
  if (!source || typeof source.value !== "number") return null;
  return abilityModifier(source.value);
}

const signed = (n: number) => `${n >= 0 ? "+" : "-"}${Math.abs(n)}`;

function splitTrailing(formula: string): { base: string; tail: string } {
  const lastOpIndex = Math.max(
    formula.lastIndexOf("+"),
    formula.lastIndexOf("-"),
  );
  return lastOpIndex > 0
    ? { base: formula.slice(0, lastOpIndex), tail: formula.slice(lastOpIndex) }
    : { base: formula, tail: "" };
}

function withTrailingModifier(formula: string, mod: number): string {
  return `${splitTrailing(formula).base}${signed(mod)}`;
}

/**
 * A typed formula ends in the total the user wants; insert the part that is
 * not the derived modifier as its own term in front of it.
 */
function keepTypedBonus(typed: string, mod: number): string {
  // The dice parser accepts "1d20 + 5"; compare and rebuild without spaces.
  const formula = typed.replace(/\s+/g, "");
  const { base, tail } = splitTrailing(formula);
  if (!/^[+-]\d+$/.test(tail)) return typed;
  const extra = Number(tail) - mod;
  if (extra === 0) return typed;
  // Fold into an existing flat term ("1d20+2" + 1 → "1d20+3") when there is one.
  const inner = splitTrailing(base);
  if (/^[+-]\d+$/.test(inner.tail)) {
    const folded = Number(inner.tail) + extra;
    const head = folded === 0 ? inner.base : `${inner.base}${signed(folded)}`;
    return `${head}${signed(mod)}`;
  }
  return `${base}${signed(extra)}${signed(mod)}`;
}
