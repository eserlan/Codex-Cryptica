export interface TovLuckRulesSpec {
  min: number;
  defaultMax: number;
  /** Luck a new character starts with. */
  startingLuck: number;
  /** Rolled to reset Luck when a character at the maximum gains more. */
  overflowResetFormula: string;
  earnCondition: string;
  spendCondition: string;
  overflowCondition: string;
  scenarios: Array<{
    name: string;
    startingLuck: number;
    action: "earn_on_failure" | "spend_on_roll" | "cap_overflow";
    amount: number;
    expectedLuck: number;
  }>;
}

/** Checked against the BFRD PDF (May 2024), Playing the Game, "Luck", pp. 120–121. */
export const TOV_LUCK_FIXTURE: TovLuckRulesSpec = {
  min: 0,
  defaultMax: 5,
  startingLuck: 0,
  overflowResetFormula: "1d4",
  earnCondition:
    "Once per turn, gain 1 Luck when you miss with an attack roll or fail a save. The GM can also award Luck for a clever idea, good roleplaying, surviving a difficult encounter or reaching a story goal.",
  spendCondition:
    "Spend Luck to add 1 to a check for each point spent, or spend 3 Luck immediately after a check to reroll its d20. Luck cannot stop a critical miss on a 1 or create a critical hit, and Luck gained from a failed roll cannot be spent on that same roll.",
  overflowCondition:
    "You can have at most 5 Luck. If you have 5 and gain more, roll a d4 and reset your Luck to the number rolled. There is no Long Rest reset.",
  scenarios: [
    {
      name: "Earn Luck on failed attack roll",
      startingLuck: 2,
      action: "earn_on_failure",
      amount: 1,
      expectedLuck: 3,
    },
    {
      // The counter stops at the cap; the player rolls the d4 reset.
      name: "Gaining Luck at the cap leaves the counter at the maximum",
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
