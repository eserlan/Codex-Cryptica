import type { FeatureEntry } from "../schema";

export const entityExplorer: FeatureEntry = {
  id: "entity-explorer",
  title: "Entity Explorer",
  summary:
    "Browse your vault from the sidebar list: search, filter by category or label, sort, group, and nest entries by dragging. The Review tab lists drafts: Approve keeps one and Reject deletes it. Drag an entry onto a canvas or map to add it.",
  channel: "production",
  // Matched by the flag, not by these; they are labels for a panel that sits
  // beside every screen.
  routes: ["/(app)"],
  areas: ["other"],
  kinds: "any",
  tabs: [],
  whenFlag: "explorer-open",
  workflows: [
    {
      id: "find-an-entry",
      title: "Find an entry",
      steps: [
        "Open Explorer in the navigation.",
        "Type in Search entities, adding #label to only show entries with that label.",
        "Use the category icons to filter, and Sort to order by Name or Last edited.",
      ],
      actionIds: ["entity-explorer.open-help"],
    },
    {
      id: "build-a-hierarchy",
      title: "Nest entries under each other",
      steps: [
        "In List View, drag an entry onto another to make it a child of that entry.",
        "Drop it on Move to Root while dragging to take it out of its parent.",
        "A drop that would make a loop does nothing.",
      ],
      actionIds: ["entity-explorer.open-help"],
    },
    {
      id: "review-drafts",
      title: "Approve or reject drafts",
      steps: [
        "Open the Review tab to see entries marked as drafts.",
        "Approve draft turns an entry into a normal one. Reject draft deletes it, so check the entry first.",
      ],
      actionIds: ["entity-explorer.open-help"],
    },
  ],
  helpIds: ["entity-explorer"],
  related: ["graph-view", "canvas"],
  actions: [
    {
      id: "entity-explorer.open-help",
      action: {
        type: "openHelp",
        helpId: "entity-explorer",
        label: "Read: Entity Explorer",
      },
    },
  ],
};
