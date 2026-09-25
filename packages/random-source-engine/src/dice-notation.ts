import type { DicePart, ModifierPart } from "dice-engine";
import { diceParser } from "dice-engine";
import type { DieSpec, Range } from "./types";

/** Keep local table rolls and synchronous coverage checks bounded. */
export const MAX_TABLE_DIE_COUNT = 1_000;
export const MAX_TABLE_DIE_RANGE = 10_000;

/**
 * Multi-die table rolls (#3403): a `DieSpec` is a single dice-engine dice
 * group plus an optional flat modifier — `NdX`, `NdXkhY`, `NdXklY`, each with
 * an optional `+/-mod` — reusing `dice-engine`'s own grammar rather than
 * inventing a second one.
 *
 * A `DieSpec` deliberately cannot express dice-engine's more general
 * multi-term formulas (`1d20 - 1d4`, exploding dice): a ranged table entry's
 * range has to have a fixed min/max, which exploding dice do not have, and
 * "which die produced this pick" stops meaning anything once two different
 * dice groups are summed.
 */

export type DieNotationResult =
  { ok: true; value: DieSpec } | { ok: false; error: string };

/** Builds the canonical dice-engine formula for a die, e.g. `4d6kh3+2`. */
export function dieFormula(die: DieSpec): string {
  const count = die.count ?? 1;
  let formula = count === 1 ? `d${die.sides}` : `${count}d${die.sides}`;
  if (die.keepHighest !== undefined) formula += `kh${die.keepHighest}`;
  else if (die.keepLowest !== undefined) formula += `kl${die.keepLowest}`;
  if (die.modifier)
    formula += die.modifier > 0 ? `+${die.modifier}` : `${die.modifier}`;
  return formula;
}

/**
 * The inclusive min/max a die can produce, used in place of `1..sides` for
 * coverage validation and table resolution once a die rolls more than one
 * die or keeps a subset of them.
 *
 * Keep-highest/lowest changes which dice count, not the extremes: every kept
 * die can still land on 1 or on `sides`, so the bound is the kept count times
 * the die's own extreme, same as an unmodified multi-die sum.
 */
export function dieRange(die: DieSpec): Range {
  const count = die.count ?? 1;
  const kept = die.keepHighest ?? die.keepLowest ?? count;
  const modifier = die.modifier ?? 0;
  return { min: kept * 1 + modifier, max: kept * die.sides + modifier };
}

/** Whether the die has safe, bounded inputs for local rolling and validation. */
export function isBoundedDieSpec(die: DieSpec): boolean {
  const count = die.count ?? 1;
  const { min, max } = dieRange(die);
  return (
    Number.isSafeInteger(die.sides) &&
    die.sides >= 1 &&
    Number.isSafeInteger(count) &&
    count >= 1 &&
    count <= MAX_TABLE_DIE_COUNT &&
    Number.isSafeInteger(min) &&
    Number.isSafeInteger(max) &&
    max - min + 1 >= 1 &&
    max - min + 1 <= MAX_TABLE_DIE_RANGE
  );
}

/** Why a single dice group can't become a `DieSpec`, or `undefined` if it can. */
function dicePartError(dice: DicePart): string | undefined {
  if (dice.count < 1) {
    return "A table die can't roll a negative number of dice.";
  }
  if (dice.options.exploding) {
    return "Exploding dice have no fixed range, so a table can't use them.";
  }
  const { keepHighest, keepLowest } = dice.options;
  if (keepHighest !== undefined && keepLowest !== undefined) {
    return "A die can keep the highest or the lowest dice, not both.";
  }
  const kept = keepHighest ?? keepLowest;
  if (kept !== undefined && kept > dice.count) {
    return `Keeping ${kept} dice needs at least ${kept} rolled.`;
  }
  return undefined;
}

function toDieSpec(dice: DicePart, modifier: number): DieSpec {
  const die: DieSpec = { sides: dice.sides };
  if (dice.count !== 1) die.count = dice.count;
  if (dice.options.keepHighest !== undefined) {
    die.keepHighest = dice.options.keepHighest;
  } else if (dice.options.keepLowest !== undefined) {
    die.keepLowest = dice.options.keepLowest;
  }
  if (modifier !== 0) die.modifier = modifier;
  return die;
}

/**
 * Parses a user-typed or imported dice expression into a `DieSpec`.
 *
 * Delegates the actual grammar to `dice-engine`'s parser, then rejects any
 * shape a table die cannot represent: more than one dice group, a negative
 * dice count, or exploding dice (no fixed range).
 */
export function parseDieNotation(input: string): DieNotationResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "No die given." };

  let parts;
  try {
    parts = diceParser.parse(trimmed).parts;
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not read that roll.",
    };
  }

  const diceParts = parts.filter((p): p is DicePart => p.type === "dice");
  if (diceParts.length !== 1) {
    return {
      ok: false,
      error: "A table die needs exactly one kind of die, like 2d6 or 4d6kh3.",
    };
  }

  const dice = diceParts[0];
  const error = dicePartError(dice);
  if (error) return { ok: false, error };
  if (!Number.isSafeInteger(dice.count) || dice.count > MAX_TABLE_DIE_COUNT) {
    return {
      ok: false,
      error: `A table die can't roll more than ${MAX_TABLE_DIE_COUNT} dice at once.`,
    };
  }
  if (!Number.isSafeInteger(dice.sides) || dice.sides < 1) {
    return {
      ok: false,
      error: "A table die needs a positive whole number of sides.",
    };
  }

  const modifier = parts
    .filter((p): p is ModifierPart => p.type === "modifier")
    .reduce((sum, m) => sum + m.value, 0);

  const value = toDieSpec(dice, modifier);
  const range = dieRange(value);
  if (
    !Number.isSafeInteger(range.min) ||
    !Number.isSafeInteger(range.max) ||
    range.max - range.min + 1 > MAX_TABLE_DIE_RANGE
  ) {
    return {
      ok: false,
      error: `A table die's possible results can't span more than ${MAX_TABLE_DIE_RANGE} numbers.`,
    };
  }
  return { ok: true, value };
}

/**
 * Normalises a die to its canonical shape: drops a redundant `count: 1` or
 * `modifier: 0`, and clamps a keep amount to the dice actually rolled so a
 * stray editor state (count lowered after a keep amount was set) can never
 * reach storage.
 */
/** A positive integer, or `fallback` for anything a number input can't stop
 * a user from typing (empty, NaN, negative — see `weightsOf`'s note on the
 * same problem). */
function positiveInt(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value! >= 1 ? Math.round(value!) : fallback;
}

export function cleanDieSpec(die: DieSpec): DieSpec {
  const count = positiveInt(die.count, 1);
  const clean: DieSpec = { sides: die.sides };
  if (count !== 1) clean.count = count;

  if (die.keepHighest !== undefined) {
    clean.keepHighest = Math.min(positiveInt(die.keepHighest, 1), count);
  } else if (die.keepLowest !== undefined) {
    clean.keepLowest = Math.min(positiveInt(die.keepLowest, 1), count);
  }

  if (die.modifier) clean.modifier = die.modifier;
  return clean;
}
