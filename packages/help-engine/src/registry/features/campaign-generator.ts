import type { FeatureEntry } from "../schema";

export const campaignGenerator: FeatureEntry = {
  id: "campaign-generator",
  title: "Campaign Generator",
  summary:
    "Generate characters, factions, locations and campaign lore inside your vault, then review the result before you keep it.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["generators"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "generate-and-keep",
      title: "Generate something and keep it",
      steps: [
        "Open Generators from the activity bar.",
        "Choose a generator and describe what you want.",
        "Review the result, then save it to your vault.",
      ],
      actionIds: ["generators.open-workflow"],
    },
  ],
  helpIds: ["in-app-generators", "generate-related"],
  related: ["session-hub"],
  actions: [
    {
      id: "generators.open-workflow",
      action: {
        type: "openGenerator",
        label: "Open the generators",
      },
    },
  ],
};
