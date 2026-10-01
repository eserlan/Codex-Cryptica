import type { FeatureEntry } from "../schema";

export const canvas: FeatureEntry = {
  id: "canvas",
  title: "Spatial Canvas",
  summary:
    "A free-form board where you place entities and draw links yourself, to plan a plot or lay out a conspiracy. Positions are yours; the graph arranges itself.",
  channel: "production",
  routes: ["/(app)/canvas"],
  areas: ["canvas"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "build-a-board",
      title: "Lay out entities on a board",
      steps: [
        "Open the Canvas from the activity bar.",
        "Drag entities in from the explorer sidebar, or add them from search.",
        "Move them where you want them and draw links between them.",
      ],
      actionIds: ["canvas.open"],
    },
  ],
  helpIds: ["spatial-canvas", "canvas-add-entities"],
  related: ["graph-view"],
  actions: [
    {
      id: "canvas.open",
      action: { type: "navigate", to: "canvas", label: "Open the Canvas" },
    },
  ],
};
