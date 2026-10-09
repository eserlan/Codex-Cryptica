import type { FeatureEntry } from "../schema";

export const backupAndRestore: FeatureEntry = {
  id: "backup-and-restore",
  title: "Export and Back Up",
  summary:
    "Download your whole vault as one file with Export Backup, and restore it into a new vault with Import Backup. Both are under Portable Backup in Settings, in the Vault tab. This is different from publishing.",
  channel: "production",
  routes: ["/(app)"],
  areas: ["settings"],
  kinds: "any",
  tabs: ["vault"],
  workflows: [
    {
      id: "export-a-backup",
      title: "Download a backup of your vault",
      steps: [
        "Open Settings, then the Vault tab.",
        "Under Portable Backup, click Export Backup.",
        "Keep the downloaded file somewhere safe, outside this device.",
      ],
      actionIds: ["backup.open-settings", "backup.open-help"],
    },
    {
      id: "restore-a-backup",
      title: "Restore a backup into a new vault",
      steps: [
        "Open Settings, then the Vault tab.",
        "Under Portable Backup, click Import Backup.",
        "Choose the file. It is restored as a new vault; your current one is untouched.",
      ],
      actionIds: ["backup.open-settings"],
    },
  ],
  helpIds: ["export-and-backup", "cloud-backup", "offline-sync"],
  related: ["archive-import", "publishing"],
  actions: [
    {
      id: "backup.open-settings",
      action: {
        type: "openPanel",
        panel: "settings-vault",
        label: "Open Vault settings",
      },
    },
    {
      id: "backup.open-help",
      action: {
        type: "openHelp",
        helpId: "export-and-backup",
        label: "Read: Export and back up your vault",
      },
    },
  ],
};
