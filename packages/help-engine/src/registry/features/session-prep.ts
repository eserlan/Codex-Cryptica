import type { FeatureEntry } from "../schema";

export const sessionPrep: FeatureEntry = {
  id: "session-prep",
  title: "Session Prep Builder",
  summary:
    "Prepare an RPG session through eight questions, then build and adjust a run sheet with optional AI suggestions.",
  channel: "production",
  routes: ["/(marketing)/tools/session-prep-builder"],
  areas: ["session-prep"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "view-guide",
      title: "Build a session run sheet",
      steps: [
        "Open the public Session Prep Builder and answer Start, Pressure, People, Places, Information, Complications, Consequences and Reserve.",
        "Answer questions yourself or explicitly ask AI for suggestions; keep, edit or reject them.",
        "Build my run sheet uses your answers; update it after edits, then copy it or choose a local vault to save it.",
      ],
      actionIds: ["session-prep.help"],
    },
  ],
  helpIds: ["session-prep"],
  related: ["session-hub", "campaign-generator"],
  actions: [
    {
      id: "session-prep.help",
      action: {
        type: "openHelp",
        helpId: "session-prep",
        label: "Read about Session Prep",
      },
    },
  ],
};
