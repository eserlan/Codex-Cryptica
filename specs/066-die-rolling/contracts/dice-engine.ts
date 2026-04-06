/**
 * Dice Engine Public API Contract
 */

export interface RollOptions {
  exploding?: boolean;
  keepHighest?: number;
  keepLowest?: number;
}

export interface DicePart {
  type: "dice";
  count: number;
  sides: number;
  options: RollOptions;
}

export interface ModifierPart {
  type: "modifier";
  value: number;
}

export type RollPart = DicePart | ModifierPart;

export interface RollCommand {
  formula: string;
  parts: RollPart[];
}

export interface PartResult {
  type: "dice" | "modifier";
  rolls?: number[]; // Individual die results
  dropped?: number[]; // Values dropped (kh/kl)
  value: number; // Total for this part (including modifier)
}

export interface RollResult {
  total: number;
  parts: PartResult[];
  formula: string;
}

/**
 * DiceEngine Interface
 */
export interface IDiceEngine {
  /**
   * Parses a die-rolling formula (e.g., "2d20kh1 + 5") into a RollCommand.
   * Throws Error if formula is invalid.
   */
  parse(formula: string): RollCommand;

  /**
   * Executes a RollCommand and returns the results.
   * Uses crypto.getRandomValues for randomization.
   */
  roll(command: RollCommand): RollResult;

  /**
   * Shorthand to parse and roll in one step.
   */
  evaluate(formula: string): RollResult;
}
