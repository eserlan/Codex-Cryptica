import type { FeatureEntry } from "../schema";

export const archiveImport: FeatureEntry = {
  id: "archive-import",
  title: "Import Notes and Files",
  summary:
    "Bring existing notes or Codex files into your vault from the Import page. Notes (.txt, .docx, .json) are analysed by the Oracle; Codex files are added as they are. Existing entities are never overwritten.",
  channel: "production",
  routes: ["/(app)/import"],
  areas: ["import"],
  kinds: "any",
  tabs: [],
  workflows: [
    {
      id: "import-files",
      title: "Import files into this vault",
      steps: [
        "Open the Import page.",
        "Drag files or a folder onto Import Files, or use Choose Files.",
        "Review what was found, then confirm. Nothing is written before you confirm.",
      ],
      actionIds: ["import.open", "import.open-help"],
    },
  ],
  helpIds: ["importing", "thread-weaver-import"],
  related: ["backup-and-restore"],
  actions: [
    {
      id: "import.open",
      action: { type: "navigate", to: "import", label: "Open Import" },
    },
    {
      id: "import.open-help",
      action: {
        type: "openHelp",
        helpId: "importing",
        label: "Read: Importing notes",
      },
    },
  ],
};
