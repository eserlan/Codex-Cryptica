import type { FeatureEntry } from "../schema";

export const diceRoller: FeatureEntry = {
  id: "dice-roller",
  title: "Dice Roller",
  summary:
    "Roll dice from a floating window opened with the dice button in the header, by clicking dice or typing a formula such as 2d20kh1 + 5. Results stay in Session History with a reroll button, and are shared with a VTT session's chat.",
  channel: "production",
  routes: ["/(app)/dice"],
  areas: ["other"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "roll-a-formula",
      title: "Roll dice",
      steps: [
        "Choose the dice button in the header. If it is missing, switch from Guided mode to Full Toolbox.",
        "Click dice to build a formula, or type one such as 2d20kh1 + 5.",
        "Press ROLL. Use Reroll this formula in Session History to roll it again.",
      ],
      actionIds: ["dice-roller.open-help"],
    },
    {
      id: "roll-with-advantage",
      title: "Roll with advantage or disadvantage",
      steps: [
        "Type 2d20kh1 to keep the highest of two d20s, or 2d20kl1 to keep the lowest.",
        "Press ROLL.",
      ],
      actionIds: ["dice-roller.open-help"],
    },
  ],
  helpIds: ["dice-roller"],
  related: ["tables"],
  actions: [
    {
      id: "dice-roller.open-help",
      action: {
        type: "openHelp",
        helpId: "dice-roller",
        label: "Read: Dice Roller",
      },
    },
  ],
};
