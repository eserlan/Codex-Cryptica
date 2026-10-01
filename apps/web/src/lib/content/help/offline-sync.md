---
id: offline-sync
title: Offline Support & Local Folders
description: Understand local-first storage, folder mirroring, portable backups, and how those differ from Codex-managed cloud copies.
tags: [technical, sync, privacy, local-first, folder, backup]
rank: 16
---

# Offline Support & Local Folders

Codex Cryptica is designed as a **local-first** application. Your working vault lives on your device first, so you can continue building your world without an internet connection.

## Local Storage (OPFS)

By default, campaign data is stored in the browser's **Origin Private File System (OPFS)**.

- **Privacy:** local vault data is not uploaded merely because you use Codex.
- **Speed:** reading and writing the vault happens locally.
- **Persistence:** your work is saved automatically on the device as you edit.

Uploading only happens when you explicitly use a feature that needs it, such as an AI request, publishing, or an opted-in cloud destination.

## Saving & Loading with Local Folders

You can mirror your internal vault to a folder on your computer. This is separate from Codex's app-managed **Cloud copy** setting.

> **Browser support:** local folder saving relies on the File System Access API.
>
> - **Chrome, Edge:** supported out of the box.
> - **Brave:** ships this feature disabled by default. If "Save to Folder" does not work, open a new tab, go to `brave://flags/#file-system-access-api`, set it to **Enabled**, and relaunch Brave.
> - **Firefox, Safari:** do not support this feature yet. Your vault still saves automatically to browser-local OPFS; you just cannot mirror it to a folder on disk until you switch to a Chromium-based browser.
>
> On any browser, you can still make a **Portable Backup** with **Settings → Portable Backup → Export Backup**, which downloads the vault as a `.codex.zip` file you can import elsewhere.

A linked folder supports several workflows:

1. **External backups:** keep a filesystem copy you control.
2. **External editing:** edit Markdown files with tools such as Obsidian or VS Code while Codex is closed.
3. **OS-managed cloud mirroring:** choose a folder already managed by Google Drive for Desktop, Dropbox, iCloud, or another desktop sync client. Your operating system/provider then handles that cloud transfer.

## Cloud copy vs a synced local folder

These are easy to confuse:

- **Local folder mirroring** writes to a folder on your computer. If another application syncs that folder, Codex does not control or monitor that remote copy.
- **Google Drive Cloud Sync** is an in-app integration with your Google Drive account and uses explicit Save/Load controls.
- **Codex Cryptica Cloud Backup** is an in-app backup destination with automatic Cloud Save after you opt in and recovery-key based restore.

Inside Codex's **Cloud copy** picker, a vault can use only **one app-managed destination at a time**: Google Drive or Codex Cryptica Cloud. A local folder mirror is a separate filesystem feature and is not that picker.

## How to set up OS-managed cloud mirroring

To keep a linked folder inside a desktop cloud provider:

1. Install the official desktop client for your provider.
2. In Codex Cryptica, click **Save to Folder** in the sidebar or the save action in **Switch Vault**.
3. If no folder is linked yet, choose a directory inside the provider's local synced folder.
4. Codex writes the local folder copy; the provider's desktop software decides when and how that folder is uploaded.

Because that remote synchronisation happens outside Codex, provider conflicts, versioning, offline queues, and account behaviour belong to the provider rather than Codex Cryptica.

## Managing Multiple Devices with a Folder

When you open Codex on another compatible device:

1. Create a new vault or open **Switch Vault**.
2. Click **Open Folder**.
3. Select the folder that your desktop cloud provider has synchronised onto that device.
4. Codex loads that folder as the local vault source.

If you instead want Codex itself to manage the remote copy, use **Settings → Vault → Cloud copy** and choose either Google Drive or Codex Cryptica Cloud.

## Related Blog Posts

- [Google Drive Cloud Sync Walkthrough](/blog/gdrive-cloud-sync) — Step-by-step guide to the in-app Google Drive integration.
- [Data Sovereignty for Game Masters](/blog/gm-guide-data-sovereignty) — Why local-first storage and user-controlled backups matter.
