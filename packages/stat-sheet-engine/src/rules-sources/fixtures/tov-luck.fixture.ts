export interface TovLuckRulesSpec {
  min: number;
  defaultMax: number;
  initialRollFormula: string;
  earnCondition: string;
  spendCondition: string;
  resetCondition: string;
  scenarios: Array<{
    name: string;
    startingLuck: number;
    action:
      "earn_on_failure" | "spend_on_roll" | "reset_long_rest" | "cap_overflow";
    amount: number;
    expectedLuck: number;
  }>;
}

export const TOV_LUCK_FIXTURE: TovLuckRulesSpec = {
  min: 0,
  defaultMax: 5,
  initialRollFormula: "1d4 + 1",
  earnCondition:
    "When a character makes a d20 roll (attack roll, ability check, or saving throw) and fails, they gain 1 Luck point up to their Luck maximum, provided they did not spend Luck on that roll.",
  spendCondition:
    "A character can spend any number of Luck points (up to their current total) to add 1 point per Luck spent to the final total of their d20 roll.",
  resetCondition:
    "On completing a long rest, a character's Luck pool is evaluated. Depending on campaign resting variants, unspent Luck is preserved or reset up to the maximum pool.",
  scenarios: [
    {
      name: "Earn Luck on failed attack roll",
      startingLuck: 2,
      action: "earn_on_failure",
      amount: 1,
      expectedLuck: 3,
    },
    {
      name: "Earn Luck when already at cap does not exceed maximum",
      startingLuck: 5,
      action: "cap_overflow",
      amount: 1,
      expectedLuck: 5,
    },
    {
      name: "Spend Luck to boost check",
      startingLuck: 4,
      action: "spend_on_roll",
      amount: 2,
      expectedLuck: 2,
    },
    {
      name: "Cannot spend more Luck than currently available",
      startingLuck: 1,
      action: "spend_on_roll",
      amount: 3,
      expectedLuck: 0,
    },
  ],
};
