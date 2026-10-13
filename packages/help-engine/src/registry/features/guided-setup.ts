import type { FeatureEntry } from "../schema";

export const guidedSetup: FeatureEntry = {
  id: "guided-setup",
  title: "Guided setup",
  summary:
    "Pick a goal (build a world, write a story, prepare an RPG campaign) and follow a few short steps to a real result. Start, continue, start over or switch goal from Help → Getting Started.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["graph"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "restart",
      title: "Start, continue or restart guided setup",
      steps: [
        "Open Help and find Guided setup under Getting Started.",
        "Pick Build a world, Write a story or Prepare an RPG campaign to start, or use Continue to pick up where you stopped.",
        "Use Start over to begin again. Stop guided setup on the card ends it at once without changing your vault.",
      ],
      actionIds: ["guided-setup.help"],
    },
  ],
  helpIds: ["guided-setup"],
  related: ["guided-mode", "graph-view"],
  actions: [
    {
      id: "guided-setup.help",
      action: {
        type: "openHelp",
        helpId: "guided-setup",
        label: "Read about guided setup",
      },
    },
  ],
};
