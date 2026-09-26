/**
 * Shared shape and helpers for showing how a dice roll was produced (#3443).
 *
 * The data is `dice-engine`'s own `PartResult[]`: every consumer hands over
 * the trace the engine returned, and nothing here re-derives dice from a
 * total or a formula. A historic roll stays the historic roll.
 */

export interface DiceBreakdownPart {
  type: "dice" | "modifier";
  value: number;
  sides?: number;
  /** Dice that counted towards `value`. */
  rolls?: number[];
  /** Dice discarded by keep-highest / keep-lowest. */
  dropped?: number[];
}

/**
 * Whether a roll has anything worth expanding. A single die with no
 * modifier is already fully described by its total, so it gets no chevron.
 */
export function hasBreakdownDetail(
  parts: readonly DiceBreakdownPart[] | undefined,
): boolean {
  if (!parts || parts.length === 0) return false;
  const diceCount = parts.reduce(
    (sum, part) =>
      part.type === "dice"
        ? sum + (part.rolls?.length ?? 0) + (part.dropped?.length ?? 0)
        : sum,
    0,
  );
  const hasModifier = parts.some((part) => part.type === "modifier");
  return diceCount > 1 || hasModifier;
}

/** `+3` / `-2` for a modifier value. */
export function formatModifier(value: number): string {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value)}`;
}

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((v) => Number.isFinite(v));

function parseDicePart(part: Record<string, unknown>) {
  if (!isNumberArray(part.rolls)) return undefined;
  if (part.dropped !== undefined && !isNumberArray(part.dropped)) {
    return undefined;
  }
  const result: DiceBreakdownPart = {
    type: "dice",
    value: part.value as number,
    rolls: part.rolls,
  };
  if (Number.isFinite(part.sides)) result.sides = part.sides as number;
  if (part.dropped) result.dropped = part.dropped as number[];
  return result;
}

function parsePart(raw: unknown): DiceBreakdownPart | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const part = raw as Record<string, unknown>;
  if (!Number.isFinite(part.value)) return undefined;
  if (part.type === "modifier") {
    return { type: "modifier", value: part.value as number };
  }
  return part.type === "dice" ? parseDicePart(part) : undefined;
}

/**
 * Reads a saved roll trace back out of untyped storage (a journal entry's
 * `sourceRef`). Anything that is not a well-formed trace yields `undefined`,
 * so an old or damaged entry simply has no breakdown rather than a wrong one.
 */
export function parseBreakdownParts(
  value: unknown,
): DiceBreakdownPart[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const parts = value.map(parsePart);
  return parts.every((part) => part !== undefined)
    ? (parts as DiceBreakdownPart[])
    : undefined;
}
