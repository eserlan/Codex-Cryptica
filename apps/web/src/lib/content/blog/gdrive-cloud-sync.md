---
id: gdrive-cloud-sync
slug: gdrive-cloud-sync
title: "Cloud Sync is Here: Back Up Your Vault to Google Drive"
description: "Your campaign world can now live on Google Drive, backed up across every device. Here's how Codex Cryptica's cloud sync works."
keywords:
  ["Google Drive", "Cloud Sync", "Vault Backup", "Local-First", "Privacy"]
publishedAt: 2026-04-30T10:00:00Z
image: "https://assets.codexcryptica.com/images/blog/gdrive-cloud-sync/gdrive-cloud-sync-hero.png"
imageAlt: "Codex Cryptica Cloud Sync Settings Panel"
---

![Cloud Sync Settings Panel](https://assets.codexcryptica.com/images/blog/gdrive-cloud-sync/gdrive-cloud-sync-hero.png)

Campaigns are long. Devices break, browsers get cleared, and gaming laptops have a way of dying right before a session. Today we're shipping something that covers you: **Google Drive cloud sync for your vault**.

## Your data, your rules

Before we get into the how, here's the part that matters most: **we never see your vault**.

When you connect to Google Drive, Codex talks directly to Google's API from your browser. The files go from your device to your personal Drive account — there is no Codex server in the middle, no copy made on our end, no analytics on your content. Your campaign world is yours, full stop.

The OAuth token that proves you're you is held in memory only. It's never written to disk, never sent to us, and disappears the moment you close the tab. If you want to revoke access at any point, you can do it from your [Google Account security settings](https://myaccount.google.com/permissions) and Codex immediately loses the ability to touch your Drive.

## Your files, your Drive

![Connect Google Drive](https://assets.codexcryptica.com/images/blog/gdrive-cloud-sync/gdrive-cloud-sync-connect.png)

When you connect a vault to Google Drive, Codex creates a `CodexCryptica/` folder on your personal Drive and drops a subfolder for each vault inside it. Every push or pull goes directly between your browser and your Drive — our servers are never in the loop.

The sync is **manual by design**. You hit "Save to Drive" when you're ready. You hit "Load from Drive" when you want to restore. No surprise uploads mid-session, no background traffic you didn't ask for.

## Differential pulls keep things fast

When you pull from Drive, Codex doesn't re-download everything. It compares what's already in your local vault against what's on Drive and only fetches files that are actually newer. A campaign with a thousand notes still pulls in seconds if only a handful changed.

## Import from Drive on any device

Already backed up your vault on another machine? Open Settings, choose the **Vault** tab, scroll to the **Cloud Sync** section, and click **Browse Drive**. Codex will list every vault subfolder it finds in your `CodexCryptica/` folder. One click and the differential pull kicks off — you're back up to speed without copying a single file by hand.

## Try it now

Head to Settings, select the **Vault** tab, scroll to the **Cloud Sync** section, and click **Connect Google Drive**. The first time you connect you'll go through a standard Google OAuth flow — takes about thirty seconds.

If you run into anything, the [help article](/help#help/gdrive-cloud-sync) has a step-by-step walkthrough.

Happy world-building.
