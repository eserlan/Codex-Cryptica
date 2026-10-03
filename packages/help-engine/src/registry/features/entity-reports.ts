import type { FeatureEntry } from "../schema";

export const entityReports: FeatureEntry = {
  id: "entity-reports",
  title: "Entity Reports",
  summary:
    "Collect entity information from a canvas, graph selection or table into a report preview, then choose whether to save it as a Note.",
  channel: "production",
  routes: ["/(app)", "/(app)/canvas", "/(app)/canvas/[slug]", "/(app)/tables"],
  areas: ["entity-reports", "canvas", "graph", "tables"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "view-guide",
      title: "Preview a report",
      steps: [
        "Choose Generate report from a canvas, graph selection or table.",
        "Review the preview, included information and Brief or Standard detail; on canvas choose Entire canvas or Selected nodes only.",
        "Save as note keeps the report and opens Zen Mode; Cancel leaves your vault unchanged.",
      ],
      actionIds: ["entity-reports.help"],
    },
  ],
  helpIds: ["spatial-canvas"],
  related: ["canvas", "entity-editing"],
  actions: [
    {
      id: "entity-reports.help",
      action: {
        type: "openHelp",
        helpId: "spatial-canvas",
        label: "Read about entity reports",
      },
    },
  ],
};
