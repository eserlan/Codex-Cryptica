import type { FeatureEntry } from "../schema";

export const graphView: FeatureEntry = {
  id: "graph-view",
  title: "Graph",
  summary:
    "See every entity as a node and every connection as a line, with automatic grouping of closely linked entities so you can explore how your world fits together.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["graph"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "graph-grouping",
      title: "Show groups of connected entities",
      steps: [
        "Open the Graph from the activity bar.",
        "Use Groups in the bottom-left toolbar to show or hide coloured group backgrounds. On mobile, open the graph toolbar menu.",
        "Use Redraw to rearrange closely linked entities into their own areas; entities with no connections are lined up separately.",
        "Groups follow connections rather than categories or labels. Toggling Groups changes backgrounds, not node positions; small groups may have no background.",
      ],
      actionIds: ["graph.open"],
    },
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
