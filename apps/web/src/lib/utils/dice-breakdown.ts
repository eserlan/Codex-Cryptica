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

/**
 * A plain-text reading of the breakdown, used as the accessible description
 * so kept and dropped dice are told apart without relying on colour or
 * strike-through.
 */
export function describeBreakdown(
  parts: readonly DiceBreakdownPart[] | undefined,
  total: number,
): string {
  const lines: string[] = [];
  for (const part of parts ?? []) {
    if (part.type === "modifier") {
      lines.push(`Modifier ${formatModifier(part.value)}`);
      continue;
    }
    const kept = (part.rolls ?? []).join(", ");
    const dropped = part.dropped ?? [];
    lines.push(
      dropped.length > 0
        ? `Kept ${kept}; dropped ${dropped.join(", ")}`
        : `Dice ${kept}`,
    );
  }
  lines.push(`Total ${total}`);
  return lines.join(". ");
}
