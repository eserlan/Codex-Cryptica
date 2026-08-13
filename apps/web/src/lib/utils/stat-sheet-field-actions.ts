import type { StatSheetField } from "schema";
import { mapSession } from "$lib/stores/map-session.svelte";
import { diceHistory } from "$lib/stores/dice-history.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { diceEngine, diceParser } from "dice-engine";

export interface DiceRollDisplay {
  text: string;
  isError: boolean;
  success?: boolean;
  total?: number;
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
          `${field.label}: ${field.formula} = ${result.total}`,
          "info",
        );
      }

      return {
        text: `= ${result.total} vs ${targetNum} (${outcome})`,
        isError: false,
        success: isSuccess,
        total: result.total,
      };
    }

    if (mapSession.vttEnabled) {
      mapSession.sendResolvedRollMessage(
        `${field.label}: ${field.formula}`,
        result,
      );
    } else {
      notificationStore.notify(
        `${field.label}: ${field.formula} = ${result.total}`,
        "success",
      );
    }
    return { text: `= ${result.total}`, isError: false, total: result.total };
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
  const byId = new Map(fields.map((f) => [f.id, f]));
  return fields.map((field) => {
    if (field.type !== "dice" || !field.modifierSource) return field;
    const source = byId.get(field.modifierSource);
    if (!source || typeof source.value !== "number") return field;

    const mod = abilityModifier(source.value);
    const formula = field.formula ?? "1d20";
    const lastOpIndex = Math.max(
      formula.lastIndexOf("+"),
      formula.lastIndexOf("-"),
    );
    const base = lastOpIndex > 0 ? formula.slice(0, lastOpIndex) : formula;
    const nextFormula = `${base}${mod >= 0 ? "+" : "-"}${Math.abs(mod)}`;

    return nextFormula === field.formula
      ? field
      : { ...field, formula: nextFormula };
  });
}
