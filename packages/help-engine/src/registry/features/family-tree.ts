import type { FeatureEntry } from "../schema";

export const familyTree: FeatureEntry = {
  id: "family-tree",
  title: "Family Tree",
  summary:
    "Explore a character’s parents, partners, children and siblings using their existing entity connections.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["entity-detail"],
  kinds: ["character"],
  tabs: ["family"],
  workflows: [
    {
      id: "view-guide",
      title: "Explore a character’s relatives",
      steps: [
        "Open a character and choose Family.",
        "Click a relative to re-centre the tree, or collapse parents and children branches.",
        "Add family links yourself in an editable vault; links are limited to characters and cannot make a character their own ancestor.",
      ],
      actionIds: ["family-tree.open", "family-tree.help"],
    },
  ],
  helpIds: ["family-tree"],
  related: ["entity-connections"],
  actions: [
    {
      id: "family-tree.open",
      action: {
        type: "openPanel",
        panel: "family-tab",
        label: "Open Family",
      },
    },
    {
      id: "family-tree.help",
      action: {
        type: "openHelp",
        helpId: "family-tree",
        label: "Read about Family Tree",
      },
    },
  ],
};
