import type { FeatureEntry } from "../schema";

export const graphView: FeatureEntry = {
  id: "graph-view",
  title: "Graph",
  summary:
    "See every entity as a node and every connection as a line, so you can explore how your world fits together.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["graph"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "explore-relationships",
      title: "Explore how entities relate",
      steps: [
        "Open the Graph from the activity bar.",
        "Select an entity to see what it is linked to.",
      ],
      actionIds: ["graph.open"],
    },
  ],
  helpIds: ["graph-basics"],
  related: ["entity-connections"],
  actions: [
    {
      id: "graph.open",
      action: { type: "navigate", to: "graph", label: "Open the graph" },
    },
  ],
};
