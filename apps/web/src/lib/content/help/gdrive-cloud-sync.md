---
id: gdrive-cloud-sync
title: Google Drive Cloud Sync
description: Mirror a vault to your own Google Drive and manually save or load changes from another device.
tags: [sync, cloud, vault, google-drive, backup, restore]
rank: 17
---

# Google Drive Cloud Sync

Codex Cryptica can copy a vault to your personal Google Drive and load it from another device. Your files go straight from your browser to your Drive — Codex Cryptica Cloud does not store this Google Drive copy.

Google Drive is one of the app-managed **Cloud copy** destinations. A vault can use only **one** of these at a time: **Google Drive** or **Codex Cryptica Cloud**. Both can restore whole-vault state, so Codex does not use both as competing sources of truth for the same vault.

## Connect Your Vault

1. Open **Settings → Vault** and find **Cloud copy**.
2. Choose **Google Drive**.
3. Click **Connect Google Drive** and sign in when Google prompts you.
4. Codex creates a `CodexCryptica/` folder on your Drive (if it does not exist) and a subfolder named after your vault inside it. The folder ID is saved locally so future syncs know where to go.

Once connected you will see two controls:

- **Save to Drive** — pushes your local vault up to Google Drive.
- **Load from Drive** — pulls the Drive version back down. Only files that are newer than your local copy are downloaded, so a repeated load stays efficient.

> [!NOTE]
> **Google Drive sync is manual.** Codex only saves to or loads from Drive when you choose the corresponding action. This is different from **Codex Cryptica Cloud Backup**, whose Cloud Save can track and upload changes automatically after you opt in.

## Import a Vault from Drive

If you have vaults already stored in your `CodexCryptica/` Drive folder from another device, you can load them without setting them up from scratch:

1. In **Settings → Vault → Cloud copy → Google Drive**, click **Browse Drive**.
2. Codex lists every vault subfolder it finds under `CodexCryptica/`.
3. Click **Load** next to any vault. Codex creates a local vault (or finds the existing one), then pulls only the files that are newer than what you have locally.

## Disconnect

Click **Disconnect** in the connected state to remove the Drive link from this vault. Your local vault and the files already stored on Drive are both preserved — only the mapping between this vault and that Drive folder is removed.

After disconnecting, you can choose a different Cloud copy destination, including **Codex Cryptica Cloud**.

## Google Drive vs Codex Cryptica Cloud Backup

Use **Google Drive** when you want the app-managed copy to live in your own Drive account and you prefer explicit Save/Load controls.

Use **Codex Cryptica Cloud Backup** when you want Codex to maintain an off-device backup with automatic Cloud Save and recovery-key based restore. See **Codex Cryptica Cloud Backup** in Help for the recovery-key, restore, attach, privacy, and deletion behaviour.

This is also different from choosing a normal local folder that happens to be synchronised by Google Drive for Desktop, Dropbox, iCloud, or another operating-system client. That workflow is described under **Offline Support & Local Folders** and is outside Codex's app-managed Cloud copy picker.

## Related Blog Posts

- [Google Drive Cloud Sync Walkthrough](/blog/gdrive-cloud-sync) — Step-by-step devlog detailing local-first cloud backup and restore.
- [Data Sovereignty for Game Masters](/blog/gm-guide-data-sovereignty) — Why local-first storage and private cloud backups keep your campaign notes safe.
