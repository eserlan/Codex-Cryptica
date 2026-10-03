import type { FeatureEntry } from "../schema";

export const sessionJournal: FeatureEntry = {
  id: "session-journal",
  title: "Session Journal",
  summary:
    "Record a play session in the scratchpad journal, organise entries, review past journals and turn chosen parts into entity drafts.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["session-journal"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "view-guide",
      title: "Record and reuse a session",
      steps: [
        "Open the Session Journal tab from the toolbar or scratchpad.",
        "Start a journal yourself, then add notes and choose a section for automatic dice rolls, card draws and table results.",
        "Review Past journals; use Make entity or Choose parts to create a draft and approve or discard it.",
      ],
      actionIds: ["session-journal.open", "session-journal.help"],
    },
  ],
  helpIds: ["quicknote"],
  related: ["session-hub"],
  actions: [
    {
      id: "session-journal.open",
      action: {
        type: "openPanel",
        panel: "session-journal",
        label: "Open Session Journal",
      },
    },
    {
      id: "session-journal.help",
      action: {
        type: "openHelp",
        helpId: "quicknote",
        label: "Read about Session Journal",
      },
    },
  ],
};
