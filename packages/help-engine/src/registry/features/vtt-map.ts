import type { FeatureEntry } from "../schema";

export const vttMap: FeatureEntry = {
  id: "vtt-map",
  title: "Maps and VTT",
  summary:
    "Pin your entities onto your own map images, reveal areas with fog of war, and start a tabletop session from a map with tokens and initiative.",
  channel: "production",
  routes: ["/(app)/map"],
  areas: ["map"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "open-a-map",
      title: "Open your maps",
      steps: [
        "Open Maps from the activity bar.",
        "Choose a map, or add one with your own image.",
        "Pin entities to it. Start a VTT session from the map when you are ready to play.",
      ],
      actionIds: ["map.open"],
    },
  ],
  helpIds: ["map-mode", "vtt-session", "fog-of-war"],
  related: ["canvas"],
  actions: [
    {
      id: "map.open",
      action: { type: "navigate", to: "map", label: "Open Maps" },
    },
  ],
};
