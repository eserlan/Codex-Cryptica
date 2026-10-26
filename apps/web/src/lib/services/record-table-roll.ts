import type { RandomSource, RollOutcome } from "random-source-engine";
import type { RollResult } from "dice-engine";
import { dieFormula } from "random-source-engine";
import type { diceHistory as DiceHistory } from "$lib/stores/dice-history.svelte";
import type { Clock } from "$lib/utils/runtime-deps";

type History = Pick<typeof DiceHistory, "addResult">;

/**
 * Writes a random-table roll into the shared roll history as a "table" result
 * (Solo Play Loop, FR-012). The table screen and the solo bar both record
 * through here, so a roll is captured the same way wherever it was made.
 */
export async function recordTableRoll(
  history: History,
  input: {
    source: RandomSource;
    outcome: RollOutcome;
    dieSides: number;
    dieLabel: string;
    clock: Clock;
  },
): Promise<void> {
  const { source, outcome, dieSides, dieLabel, clock } = input;
  const root = outcome.chain[0];
  const value = root?.dieValue;
  const roll: RollResult = {
    total: value ?? 0,
    parts:
      root?.rollParts ??
      (value === undefined
        ? []
        : [{ type: "dice", sides: dieSides, rolls: [value], value }]),
    formula: dieLabel,
    timestamp: clock.now(),
  };
  await history.addResult(roll, "table", {
    label: source.name,
    source: {
      sourceId: source.id,
      sourceName: source.name,
      kind: source.kind,
      finalText: outcome.finalText,
      chain: outcome.chain,
    },
  });
}

/**
 * The die a table rolls on, and how it is written (e.g. `d6`, `4d6kh3+2`).
 * A ranged table uses its own die; otherwise the sum of its entry weights.
 */
export function tableDie(source: RandomSource): {
  sides: number;
  label: string;
} {
  if (source.selection?.mode === "ranged") {
    return {
      sides: source.selection.die.sides,
      label: dieFormula(source.selection.die),
    };
  }
  const sides = (source.entries ?? []).reduce(
    (sum, e) => sum + (e.weight ?? 1),
    0,
  );
  return { sides, label: `d${sides}` };
}
