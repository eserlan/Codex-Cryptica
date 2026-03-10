import type { RollCommand, RollPart, RollOptions } from "./types";

export class DiceParser {
  /**
   * Basic AdXkhY! + B parser
   * Supports addition and subtraction of dice and modifiers.
   */
  parse(formula: string): RollCommand {
    const cleanFormula = formula.toLowerCase().replace(/\s+/g, "");
    if (!cleanFormula) {
      throw new Error("Empty roll formula");
    }

    const parts: RollPart[] = [];

    // We split by + or - while keeping the delimiter to handle modifiers and dice signs
    const segments = cleanFormula.split(/([+-])/);

    let currentSign = 1;

    for (const segment of segments) {
      if (segment === "+") {
        continue;
      }
      if (segment === "-") {
        currentSign *= -1; // Flip sign for consecutive minuses
        continue;
      }
      if (!segment.trim()) continue;

      // Tighten regex: (\d+)?d(\d+) followed optionally by valid tokens ONLY
      // Valid tokens: ! (exploding), kh(\d+)? (keep highest), kl(\d+)? (keep lowest)
      const diceMatch = segment.match(/^(\d+)?d(\d+)([!khl0-9]*)$/);

      if (diceMatch) {
        const count = parseInt(diceMatch[1] || "1", 10);
        const sides = parseInt(diceMatch[2], 10);
        const suffix = diceMatch[3] || "";

        const options: RollOptions = {
          exploding: false,
        };

        // Validate suffix content strictly
        let remainingSuffix = suffix;

        if (remainingSuffix.includes("!")) {
          options.exploding = true;
          remainingSuffix = remainingSuffix.replace("!", "");
        }

        const khMatch = remainingSuffix.match(/kh(\d+)?/);
        if (khMatch) {
          options.keepHighest = parseInt(khMatch[1] || "1", 10);
          remainingSuffix = remainingSuffix.replace(khMatch[0], "");
        }

        const klMatch = remainingSuffix.match(/kl(\d+)?/);
        if (klMatch) {
          options.keepLowest = parseInt(klMatch[1] || "1", 10);
          remainingSuffix = remainingSuffix.replace(klMatch[0], "");
        }

        // If there's still content in the suffix, it's an invalid token
        if (remainingSuffix.length > 0) {
          throw new Error(`Invalid tokens in roll formula: ${remainingSuffix}`);
        }

        parts.push({
          type: "dice",
          count: count * currentSign,
          sides,
          options,
        });
        currentSign = 1;
      } else {
        // Strict modifier check: MUST be entirely numeric
        if (/^\d+$/.test(segment)) {
          const val = parseInt(segment, 10);
          parts.push({
            type: "modifier",
            value: val * currentSign,
          });
          currentSign = 1;
        } else {
          throw new Error(`Invalid roll segment: ${segment}`);
        }
      }
    }

    if (parts.length === 0) {
      throw new Error("Invalid roll formula");
    }

    return {
      formula,
      parts,
    };
  }
}

export const diceParser = new DiceParser();
