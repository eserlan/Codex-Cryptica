import type { FeatureEntry } from "../schema";

export const statSheets: FeatureEntry = {
  id: "stat-sheets",
  title: "Stat Sheets",
  summary:
    "Track hit points, resources and rollable actions on an entity; reuse field layouts and compatible presentation templates.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["entity-detail"],
  kinds: "any",
  tabs: ["stats"],
  workflows: [
    {
      id: "view-guide",
      title: "View stats and reusable layouts",
      steps: [
        "Open an entity and choose Stats.",
        "Use Templates for reusable field layouts and Presentations for compatible visual layouts.",
        "Manage saved layouts and category defaults in Settings → Templates → Stat sheets; changing values remains your choice.",
      ],
      actionIds: [
        "stat-sheets.open",
        "stat-sheets.settings",
        "stat-sheets.help",
      ],
    },
  ],
  helpIds: ["stat-sheets", "sharing-templates"],
  related: ["entity-templates"],
  actions: [
    {
      id: "stat-sheets.open",
      action: {
        type: "openPanel",
        panel: "stats-tab",
        label: "Open Stats",
      },
    },
    {
      id: "stat-sheets.settings",
      action: {
        type: "openPanel",
        panel: "settings-templates",
        label: "Open template settings",
      },
    },
    {
      id: "stat-sheets.help",
      action: {
        type: "openHelp",
        helpId: "stat-sheets",
        label: "Read about Stat Sheets",
      },
    },
  ],
};
