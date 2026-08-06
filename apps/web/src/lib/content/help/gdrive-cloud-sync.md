---
id: gdrive-cloud-sync
title: Google Drive Cloud Sync
tags: [sync, cloud, vault, google-drive]
rank: 17
---

# Google Drive Cloud Sync

Codex Cryptica can back up your vault to your personal Google Drive and restore it from any device. Your files go straight from your browser to your Drive — our servers never see them.

## Connect Your Vault

1. Open Settings, choose the **Vault** tab, and scroll to the **Cloud Sync** section.
2. Click **Connect Google Drive** and sign in when Google prompts you.
3. Codex creates a `CodexCryptica/` folder on your Drive (if it doesn't exist) and a subfolder named after your vault inside it. The folder ID is saved locally so future syncs know where to go.

Once connected you'll see two buttons:

- **Save to Drive** — pushes your local vault up to the cloud.
- **Load from Drive** — pulls the cloud version back down. Only files that are newer than your local copy are downloaded, so a full re-pull stays fast.

> [!NOTE]
> Sync is always manual. Codex never uploads in the background without you clicking a button, so you stay in control of what leaves your device.

## Import a Vault from Drive

If you have vaults already stored in your `CodexCryptica/` Drive folder (from another device), you can load them without setting them up from scratch:

1. In the **Vault** settings tab under **Cloud Sync**, click **Browse Drive**.
2. Codex lists every vault subfolder it finds under `CodexCryptica/`.
3. Click **Load** next to any vault. Codex creates a local vault (or finds the existing one), then pulls only the files that are newer than what you have locally.

## Disconnect

Click **Disconnect** in the connected state to remove the Drive link from this vault. Your local vault and the files on Drive are both preserved — only the sync mapping is removed.

## Related Blog Posts

- [Google Drive Cloud Sync Walkthrough](/blog/gdrive-cloud-sync) — Step-by-step devlog detailing local-first cloud backup and restore.
- [Data Sovereignty for Game Masters](/blog/gm-guide-data-sovereignty) — Why local-first storage and private cloud backups keep your campaign notes safe.
