import type { StatSheetField } from "schema";
import { mapSession } from "$lib/stores/map-session.svelte";
import { diceHistory } from "$lib/stores/dice-history.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { diceEngine, diceParser } from "dice-engine";

export interface DiceRollDisplay {
  text: string;
  isError: boolean;
  success?: boolean;
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
    await diceHistory.addResult(result, "modal");

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
          `${field.label}: ${field.formula} = ${result.total} vs ${targetNum} (${outcome})`,
          isSuccess ? "success" : "error",
        );
      }

      return {
        text: `= ${result.total} vs ${targetNum} (${outcome})`,
        isError: false,
        success: isSuccess,
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
    return { text: `= ${result.total}`, isError: false };
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
