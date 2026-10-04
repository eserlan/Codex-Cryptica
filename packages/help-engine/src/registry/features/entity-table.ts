import type { FeatureEntry } from "../schema";

export const entityTable: FeatureEntry = {
  id: "entity-table",
  title: "Entity Table",
  summary:
    "Review every entry in a spreadsheet-style table. Sort by a column, search with #label, filter by type, label or missing details, then select entries to add or remove labels or to make a report. Right-click for Send to Shelf, Manage Labels, Change Type or Delete.",
  channel: "production",
  routes: ["/(app)/table"],
  areas: ["other"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "find-incomplete-entries",
      title: "Find entries that are missing something",
      steps: [
        "Open Table in the navigation.",
        "Turn on Incomplete only to see entries missing a summary, labels or connections.",
        "Use the filter button next to a column heading to narrow the view, and Clear all filters to start again.",
      ],
      actionIds: ["entity-table.open-help"],
    },
    {
      id: "label-several-entries",
      title: "Add or remove a label on many entries",
      steps: [
        "Click rows to select them, or hold Shift and click to select a range.",
        "In the bar above the table, choose Add / remove labels.",
        "Press Escape to clear the selection.",
      ],
      actionIds: ["entity-table.open-help"],
    },
    {
      id: "report-from-a-selection",
      title: "Make a report from selected entries",
      steps: [
        "Select the entries you want.",
        "Choose Generate report in the bar above the table. It is not offered in a shared world.",
      ],
      actionIds: ["entity-table.open-help"],
    },
  ],
  helpIds: ["entity-table"],
  related: ["entity-reports", "graph-view"],
  actions: [
    {
      id: "entity-table.open-help",
      action: {
        type: "openHelp",
        helpId: "entity-table",
        label: "Read: Entity Table",
      },
    },
  ],
};
