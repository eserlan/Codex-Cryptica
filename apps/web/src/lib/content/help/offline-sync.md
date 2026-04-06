---
id: offline-sync
title: Offline Support & Synchronization
tags: [technical, sync, privacy]
rank: 16
---

# Offline Support & Synchronization

Codex Cryptica is designed as a **local-first** application. This means your data always lives on your device first, ensuring you can continue building your world even without an internet connection.

## Local Storage (OPFS)

By default, all your campaign data is stored in the **Origin Private File System (OPFS)**. This is a high-performance, sandboxed area within your browser.

- **Privacy:** Your data is not uploaded to our servers.
- **Speed:** Reading and writing thousands of chronicles is near-instant.
- **Persistence:** Your work is saved automatically as you type.

## Synchronization with Local Folders

You can mirror your internal archives with any folder on your computer. This enables several powerful workflows:

1.  **External Backups:** Keep a real-time copy of your world in a folder you control.
2.  **External Editing:** Use your favorite Markdown editor (like Obsidian or VS Code) to edit your chronicles while Codex is closed.
3.  **Cloud Mirroring:** By selecting a folder managed by a cloud provider (like Google Drive, Dropbox, or iCloud), you can achieve multi-device synchronization using your OS's built-in support.

### How to set up Cloud Sync (via OS)

To sync your world across multiple devices using Google Drive or other providers:

1.  Install the official client for your provider (e.g., [Google Drive for Desktop](https://www.google.com/drive/download/)).
2.  In Codex Cryptica, go to **Settings > Vault**.
3.  Under **Synchronization**, click **Sync to Folder**.
4.  Select a folder within your local Google Drive/Cloud directory.
5.  Codex will now mirror your files to that folder, and your OS will handle the background upload to the cloud.

## Managing Multiple Devices

When you open Codex on a new device:

1.  Create a new vault or open the **Vault Selector**.
2.  Click **Open Folder**.
3.  Select the cloud-synced folder you set up on your first device.
4.  Codex will import your world and keep it in sync with the cloud mirror.
