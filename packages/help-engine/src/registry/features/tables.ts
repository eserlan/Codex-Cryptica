import type { FeatureEntry } from "../schema";

export const tables: FeatureEntry = {
  id: "tables",
  title: "Random Tables",
  summary:
    "Roll on tables and draw from decks to get ideas at the table. Tables and decks are listed on the Random Tables page.",
  channel: "production",
  routes: ["/(app)/tables"],
  areas: ["tables"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "roll-on-a-table",
      title: "Roll on a table",
      steps: [
        "Open Random Tables from the activity bar.",
        "Choose a table, then roll.",
      ],
      actionIds: ["tables.open"],
    },
  ],
  helpIds: ["random-tables-decks"],
  related: [],
  actions: [
    {
      id: "tables.open",
      action: { type: "navigate", to: "tables", label: "Open Random Tables" },
    },
  ],
};
