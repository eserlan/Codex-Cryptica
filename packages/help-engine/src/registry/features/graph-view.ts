import type { FeatureEntry } from "../schema";

export const graphView: FeatureEntry = {
  id: "graph-view",
  title: "Graph",
  summary:
    "See entities as nodes and connections as lines. The Graph can show automatic visual clusters of connected entities; these are not manually created groups and do not change entity data.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["graph"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "graph-grouping",
      title: "Understand visual groups in the Graph",
      steps: [
        "Open the Graph from the activity bar.",
        "Use Groups in the bottom-left toolbar to cycle soft, strong, and hidden backgrounds. On mobile, open the graph toolbar menu.",
        "These clusters are calculated from entity connections. You cannot manually create a Graph group or add, remove, rename, resize, or style its members.",
        "Use Redraw to rearrange connected entities. Arrange cards on Spatial Canvas, or save a Graph layout with a Saved View.",
        "Groups follow connections, not categories or labels. Backgrounds change no entity data, relationships, or node positions; small groups may have no background.",
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
