/**
 * Quick Oracle & Solo Scene Direction Generators
 * Lightweight, crypto-random oracle tools for steering solo RPG play & character dialogue.
 */

export type OracleOdds = "likely" | "even" | "unlikely";

export type OracleTier =
  | "extreme_positive"
  | "positive"
  | "mixed_positive"
  | "mixed_negative"
  | "negative"
  | "extreme_negative";

export interface OracleOutcome {
  odds: OracleOdds;
  roll: number;
  tier: OracleTier;
  text: string;
  formattedCue: string;
}

function getSecureRandom(rng?: () => number): number {
  let value: number;

  if (rng) {
    value = rng();
  } else if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    value = array[0] / (0xffffffff + 1);
  } else {
    value = Math.random();
  }

  if (!Number.isFinite(value)) {
    throw new RangeError("Random source must return a finite number");
  }

  // Browser random sources are in [0, 1), but injected sources can return an
  // endpoint. Clamp it so every dice/table lookup remains in range.
  return Math.min(Math.max(value, 0), 1 - Number.EPSILON);
}

/**
 * Standard 6-tier Solo RPG Oracle (Yes/No with qualifiers)
 * Supports probability weighting: Even (50/50), Likely (70/30), Unlikely (30/70).
 */
export function rollOracleOutcome(
  odds: OracleOdds = "even",
  rng?: () => number,
): OracleOutcome {
  // Roll d100 (1 to 100)
  const roll = Math.floor(getSecureRandom(rng) * 100) + 1;

  let tier: OracleTier;
  let text: string;

  if (odds === "likely") {
    if (roll <= 15) {
      tier = "extreme_positive";
      text = "Yes, and...";
    } else if (roll <= 65) {
      tier = "positive";
      text = "Yes";
    } else if (roll <= 80) {
      tier = "mixed_positive";
      text = "Yes, but...";
    } else if (roll <= 90) {
      tier = "mixed_negative";
      text = "No, but...";
    } else if (roll <= 97) {
      tier = "negative";
      text = "No";
    } else {
      tier = "extreme_negative";
      text = "No, and...";
    }
  } else if (odds === "unlikely") {
    if (roll <= 3) {
      tier = "extreme_positive";
      text = "Yes, and...";
    } else if (roll <= 10) {
      tier = "positive";
      text = "Yes";
    } else if (roll <= 20) {
      tier = "mixed_positive";
      text = "Yes, but...";
    } else if (roll <= 35) {
      tier = "mixed_negative";
      text = "No, but...";
    } else if (roll <= 85) {
      tier = "negative";
      text = "No";
    } else {
      tier = "extreme_negative";
      text = "No, and...";
    }
  } else {
    // Even odds
    if (roll <= 10) {
      tier = "extreme_positive";
      text = "Yes, and...";
    } else if (roll <= 45) {
      tier = "positive";
      text = "Yes";
    } else if (roll <= 55) {
      tier = "mixed_positive";
      text = "Yes, but...";
    } else if (roll <= 65) {
      tier = "mixed_negative";
      text = "No, but...";
    } else if (roll <= 90) {
      tier = "negative";
      text = "No";
    } else {
      tier = "extreme_negative";
      text = "No, and...";
    }
  }

  const formattedCue =
    odds === "even" ? `Oracle: ${text}` : `Oracle (${odds}): ${text}`;

  return {
    odds,
    roll,
    tier,
    text,
    formattedCue,
  };
}

export interface PbtAResult {
  die1: number;
  die2: number;
  total: number;
  tier: "strong_hit" | "weak_hit" | "miss";
  label: string;
  formattedCue: string;
}

/**
 * 2d6 PbtA / Ironsworn style move roll (10+ Strong Hit, 7-9 Weak Hit, 6- Miss)
 */
export function rollPbtAMove(rng?: () => number): PbtAResult {
  const die1 = Math.floor(getSecureRandom(rng) * 6) + 1;
  const die2 = Math.floor(getSecureRandom(rng) * 6) + 1;
  const total = die1 + die2;

  let tier: "strong_hit" | "weak_hit" | "miss";
  let label: string;

  if (total >= 10) {
    tier = "strong_hit";
    label = "Strong Hit (Full Success)";
  } else if (total >= 7) {
    tier = "weak_hit";
    label = "Weak Hit (Success with a catch)";
  } else {
    tier = "miss";
    label = "Miss (Complication or setback)";
  }

  return {
    die1,
    die2,
    total,
    tier,
    label,
    formattedCue: `2d6 = ${total}: ${label}`,
  };
}

const ACTION_VERBS = [
  "Betray",
  "Demand",
  "Conceal",
  "Warn",
  "Bargain",
  "Reveal",
  "Protect",
  "Question",
  "Deflect",
  "Provoke",
  "Inspect",
  "Offer",
  "Reject",
  "Enforce",
  "Praise",
  "Intimidate",
  "Uncover",
  "Forge",
  "Evade",
  "Surrender",
] as const;

const THEME_NOUNS = [
  "Secret Oath",
  "Heavy Toll",
  "Hidden Danger",
  "Ancient Rite",
  "Lost Allegiance",
  "Forbidden Lore",
  "Rare Bounty",
  "Unspoken Fear",
  "Blood Debt",
  "Sacred Boundary",
  "Stolen Relic",
  "Impending Storm",
  "Rival Faction",
  "True Identity",
  "Fragile Alliance",
  "Fatal Flaw",
  "Desperate Plea",
  "Buried Treasure",
  "Looming Ambush",
  "Silent Watcher",
] as const;

/**
 * Random Spark / Scene Theme generator (Action + Theme pair)
 */
export function rollActionSpark(rng?: () => number): {
  verb: string;
  noun: string;
  formattedCue: string;
} {
  const verbIdx = Math.floor(getSecureRandom(rng) * ACTION_VERBS.length);
  const nounIdx = Math.floor(getSecureRandom(rng) * THEME_NOUNS.length);

  const verb = ACTION_VERBS[verbIdx];
  const noun = THEME_NOUNS[nounIdx];

  return {
    verb,
    noun,
    formattedCue: `Spark: ${verb} ${noun}`,
  };
}

/**
 * Quick d20 roll
 */
export function rollD20(rng?: () => number): {
  roll: number;
  formattedCue: string;
} {
  const roll = Math.floor(getSecureRandom(rng) * 20) + 1;
  return {
    roll,
    formattedCue: `d20 = ${roll}`,
  };
}
