import type { RollCommand, RollPart, RollOptions } from "./types";

export class DiceParser {
  /**
   * Basic AdXkhY! + B parser
   * Supports addition and subtraction of dice and modifiers.
   */
  parse(formula: string): RollCommand {
    const cleanFormula = formula.toLowerCase().replace(/\s+/g, "");
    const parts: RollPart[] = [];

    // We split by + or - while keeping the delimiter to handle modifiers and dice signs
    const segments = cleanFormula.split(/([+-])/);

    let currentSign = 1;

    for (const segment of segments) {
      if (segment === "+") {
        // currentSign * 1 = currentSign (no change)
        continue;
      }
      if (segment === "-") {
        currentSign *= -1; // Flip sign for consecutive minuses
        continue;
      }
      if (!segment.trim()) continue;

      // Try matching dice: (\d+)?d(\d+)(!|kh\d+|kl\d+)*
      const diceMatch = segment.match(/^(\d+)?d(\d+)(.*)$/);

      if (diceMatch) {
        const count = parseInt(diceMatch[1] || "1", 10);
        const sides = parseInt(diceMatch[2], 10);
        const suffix = diceMatch[3] || "";

        const options: RollOptions = {
          exploding: suffix.includes("!"),
        };

        const khMatch = suffix.match(/kh(\d+)?/);
        if (khMatch) {
          options.keepHighest = parseInt(khMatch[1] || "1", 10);
        }

        const klMatch = suffix.match(/kl(\d+)?/);
        if (klMatch) {
          options.keepLowest = parseInt(klMatch[1] || "1", 10);
        }

        parts.push({
          type: "dice",
          count: count * currentSign, // Maintain sign for subtraction support
          sides,
          options,
        });
        currentSign = 1; // Reset for next segment
      } else {
        // Try matching pure modifier
        const val = parseInt(segment, 10);
        if (!isNaN(val)) {
          parts.push({
            type: "modifier",
            value: val * currentSign,
          });
          currentSign = 1; // Reset for next segment
        } else {
          throw new Error(`Invalid roll segment: ${segment}`);
        }
      }
    }

    if (parts.length === 0) {
      throw new Error("Empty roll formula");
    }

    return {
      formula,
      parts,
    };
  }
}

export const diceParser = new DiceParser();
