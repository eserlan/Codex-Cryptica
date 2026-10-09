import type { FeatureEntry } from "../schema";

export const guidedMode: FeatureEntry = {
  id: "guided-mode",
  title: "Guided Mode",
  summary:
    "Use Guided mode for a smaller set of tools and contextual creation choices, or switch to Full Toolbox to see all tools.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["graph"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "view-guide",
      title: "Find the tools you need",
      steps: [
        "Use the Guided / Full Toolbox switch to choose how many tools are shown.",
        "Guided mode offers contextual creation choices and suggestions; switching modes does not change your entities.",
        "Quick Start World is a separate action that creates a world; review its genre and premise before generating.",
      ],
      actionIds: ["guided-mode.help"],
    },
  ],
  helpIds: ["guided-mode"],
  related: ["entity-editing", "campaign-generator"],
  actions: [
    {
      id: "guided-mode.help",
      action: {
        type: "openHelp",
        helpId: "guided-mode",
        label: "Read about Guided Mode",
      },
    },
  ],
};
