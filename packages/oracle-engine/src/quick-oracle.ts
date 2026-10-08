/**
 * Quick Oracle & Solo Scene Direction Generators
 * Lightweight, crypto-random oracle tools for steering solo RPG play & character dialogue.
 */

export type OracleOdds =
  "very_likely" | "likely" | "even" | "unlikely" | "very_unlikely";

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

/** Upper bound (inclusive) of each d100 band, with its tier and wording, per odds. */
type Band = readonly [upper: number, tier: OracleTier, text: string];

const LADDERS: Record<OracleOdds, readonly Band[]> = {
  very_likely: [
    [25, "extreme_positive", "Yes, and..."],
    [75, "positive", "Yes"],
    [85, "mixed_positive", "Yes, but..."],
    [93, "mixed_negative", "No, but..."],
    [98, "negative", "No"],
    [100, "extreme_negative", "No, and..."],
  ],
  likely: [
    [15, "extreme_positive", "Yes, and..."],
    [65, "positive", "Yes"],
    [80, "mixed_positive", "Yes, but..."],
    [90, "mixed_negative", "No, but..."],
    [97, "negative", "No"],
    [100, "extreme_negative", "No, and..."],
  ],
  even: [
    [10, "extreme_positive", "Yes, and..."],
    [45, "positive", "Yes"],
    [55, "mixed_positive", "Yes, but..."],
    [65, "mixed_negative", "No, but..."],
    [90, "negative", "No"],
    [100, "extreme_negative", "No, and..."],
  ],
  unlikely: [
    [3, "extreme_positive", "Yes, and..."],
    [10, "positive", "Yes"],
    [20, "mixed_positive", "Yes, but..."],
    [35, "mixed_negative", "No, but..."],
    [85, "negative", "No"],
    [100, "extreme_negative", "No, and..."],
  ],
  very_unlikely: [
    [2, "extreme_positive", "Yes, and..."],
    [8, "positive", "Yes"],
    [12, "mixed_positive", "Yes, but..."],
    [22, "mixed_negative", "No, but..."],
    [90, "negative", "No"],
    [100, "extreme_negative", "No, and..."],
  ],
};

/** The band a d100 roll lands in. Unknown odds read as even. */
function tierFor(
  odds: OracleOdds,
  roll: number,
): readonly [OracleTier, string] {
  const ladder = LADDERS[odds] ?? LADDERS.even;
  const band =
    ladder.find(([upper]) => roll <= upper) ?? ladder[ladder.length - 1];
  return [band[1], band[2]];
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

  const [tier, text] = tierFor(odds, roll);

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
