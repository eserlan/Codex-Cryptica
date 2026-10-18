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
    {
      id: "tips",
      title: "Turn tips from Cif on or off",
      steps: [
        "Open Settings and choose the AI tab.",
        "Turn on Show tips from Cif. It is off until you turn it on, and you are also asked once when guided setup ends.",
        "Turn it off at any time. A tip you dismissed does not come back.",
      ],
      actionIds: ["guided-setup.tips-settings"],
    },
  ],
  helpIds: ["guided-setup"],
  related: ["guided-mode", "graph-view"],
  actions: [
    {
      id: "guided-setup.tips-settings",
      action: {
        type: "openPanel",
        panel: "settings-intelligence",
        label: "Open AI settings",
      },
    },
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
