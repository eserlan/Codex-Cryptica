import type { FeatureEntry } from "../schema";

export const chronology: FeatureEntry = {
  id: "chronology",
  title: "Chronology",
  summary:
    "Browse campaign history in Calendar, Agenda, Timeline or Bands, filter events and use custom calendar dates.",
  channel: "production",
  routes: ["/(app)", "/(app)/timeline"],
  areas: ["chronology", "entity-detail"],
  kinds: "any",
  tabs: ["timeline"],
  workflows: [
    {
      id: "view-guide",
      title: "Browse campaign history",
      steps: [
        "Open Chronology and choose Calendar, Agenda, Timeline or Bands.",
        "Narrow events with Type, Label and Related filters.",
        "Look for incomplete dates under Undated/Approximate in Agenda; change the calendar yourself in Vault Settings.",
      ],
      actionIds: ["chronology.open", "chronology.tab", "chronology.help"],
    },
  ],
  helpIds: ["chronology"],
  related: ["entity-editing"],
  actions: [
    {
      id: "chronology.open",
      action: {
        type: "navigate",
        to: "timeline",
        label: "Open Chronology",
      },
    },
    {
      id: "chronology.tab",
      action: {
        type: "openPanel",
        panel: "timeline-tab",
        label: "Open the entity timeline",
      },
    },
    {
      id: "chronology.help",
      action: {
        type: "openHelp",
        helpId: "chronology",
        label: "Read about Chronology",
      },
    },
  ],
};
