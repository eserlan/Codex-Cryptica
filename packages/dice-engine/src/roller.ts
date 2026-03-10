import type { RollCommand, RollResult, PartResult, DicePart } from "./types";

export class DiceEngine {
  /**
   * Generates a random integer between 1 and sides (inclusive)
   * Uses rejection sampling to ensure perfect fairness (no modulo bias).
   */
  private getRandomInt(sides: number): number {
    if (sides <= 0) return 0;
    if (sides === 1) return 1;

    const array = new Uint32Array(1);
    const max = Math.floor(0xffffffff / sides) * sides;
    let unbiasedRoll: number;

    do {
      crypto.getRandomValues(array);
      unbiasedRoll = array[0];
    } while (unbiasedRoll >= max);

    return (unbiasedRoll % sides) + 1;
  }

  /**
   * Executes a roll for a single DicePart
   */
  private rollDice(part: DicePart): PartResult {
    const { count, sides, options } = part;
    let rolls: number[] = [];
    const dropped: number[] = [];

    // Perform initial rolls (handle negative count if provided by parser)
    const absoluteCount = Math.abs(count);
    for (let i = 0; i < absoluteCount; i++) {
      let roll = this.getRandomInt(sides);
      rolls.push(roll);

      // Handle exploding dice
      if (options.exploding && roll === sides && sides > 1) {
        let explosions = 0;
        // Safety cap to prevent infinite explosions
        while (roll === sides && explosions < 100) {
          roll = this.getRandomInt(sides);
          rolls.push(roll);
          explosions++;
        }
      }
    }

    // Handle Keep Highest / Keep Lowest
    if (options.keepHighest !== undefined || options.keepLowest !== undefined) {
      const sorted = [...rolls].sort((a, b) => b - a); // descending
      let keepCount = options.keepHighest ?? options.keepLowest ?? rolls.length;
      keepCount = Math.max(0, Math.min(keepCount, rolls.length));

      let toKeep: number[];
      if (options.keepHighest !== undefined) {
        toKeep = sorted.slice(0, keepCount);
      } else {
        toKeep = sorted.slice(-keepCount);
      }

      const keptCounts = new Map<number, number>();
      for (const val of toKeep) {
        keptCounts.set(val, (keptCounts.get(val) ?? 0) + 1);
      }

      const finalRolls: number[] = [];
      for (const val of rolls) {
        const currentCount = keptCounts.get(val) ?? 0;
        if (currentCount > 0) {
          finalRolls.push(val);
          keptCounts.set(val, currentCount - 1);
        } else {
          dropped.push(val);
        }
      }
      rolls = finalRolls;
    }

    // Determine sign: negative count implies subtraction (handled by parser for formulas like "1d20 - 1d4")
    const sign = count < 0 ? -1 : 1;
    const value = rolls.reduce((sum, r) => sum + r, 0) * sign;

    return {
      type: "dice",
      sides, // Metadata for UI
      rolls,
      dropped: dropped.length > 0 ? dropped : undefined,
      value,
    };
  }

  /**
   * Evaluates a RollCommand
   */
  execute(command: RollCommand): RollResult {
    const partResults: PartResult[] = [];
    let total = 0;

    for (const part of command.parts) {
      if (part.type === "modifier") {
        const res: PartResult = {
          type: "modifier",
          value: part.value,
        };
        partResults.push(res);
        total += part.value;
      } else {
        const res = this.rollDice(part);
        partResults.push(res);
        total += res.value;
      }
    }

    return {
      total,
      parts: partResults,
      formula: command.formula,
      timestamp: Date.now(),
    };
  }
}

export const diceEngine = new DiceEngine();
