/**
 * Dice Engine Public API Types
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
  sides?: number; // Added for UI icon resolution
  rolls?: number[]; // Individual die results
  dropped?: number[]; // Values dropped (kh/kl)
  value: number; // Total for this part
}

export interface RollResult {
  total: number;
  parts: PartResult[];
  formula: string;
  timestamp: number;
}
