import type { FeatureEntry } from "../schema";

export const canvas: FeatureEntry = {
  id: "canvas",
  title: "Spatial Canvas",
  summary:
    "A free-form board for placing entities and drawing links. Drag cards, adjust their layer order, lock them, or use the one-time auto-arrange control; each canvas saves its own layout.",
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
