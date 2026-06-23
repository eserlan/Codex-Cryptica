---
id: publishing
title: Publishing Guest Snapshots
tags: [publishing, guest, share, cloud, r2]
rank: 18
---

# Publishing Guest Snapshots

Codex Cryptica allows you to publish a read-only, player-safe snapshot of your campaign lore to the cloud. This lets your players browse the world lore independently, navigate relationship graphs, and read entries even when you are offline or the browser window is closed.

## How It Works

Publishing compiles a read-only snapshot copy of your campaign notes:

1. **Physical Secret Redaction**: The system automatically and physically removes all GM-facing secrets, including the `Lore` and `Art Direction` fields.
2. **Fog of War Visibility**: All entities marked as `GM-only` or `private` are excluded from the exported snapshot.
3. **Player-Visible Filters**: Maps and canvases are only exported if they are explicitly marked as **Player-Visible** in their respective configurations.
4. **Dangling Link Redaction**: If a public entity links to a private entity, the link and its text are automatically replaced with a `[Redacted]` placeholder.
5. **Background Sync**: Compilation and upload happen entirely in the background, allowing you to close the settings panel or continue worldbuilding immediately.

## Publishing a Snapshot

To publish your campaign:

1. Click the **Settings** cog in the bottom-right or top-right, and select the **Publishing** tab.
2. Under **Player-Safe Snapshot Hosting**, click **Publish Guest Snapshot**.
3. A **Publish Preview** modal will appear showing the numeric count of included vs. excluded elements (NPCs, maps, secrets, drafts, etc.).
4. Click **Publish Snapshot** to confirm. 
5. Once the upload finishes in the background, you will receive a shareable link that you can copy and send to your players.

## Updating a Publication

When you make changes to your world notes, you can update the shared player snapshot at any time:

1. Open **Settings** -> **Publishing**.
2. Click **Publish Update**.
3. The system will calculate file hashes for all assets, upload only the newly changed or added assets to the cloud, and delete any orphaned assets that are no longer referenced in the updated vault snapshot.

## Unpublishing

If you wish to retract your campaign and remove it from the cloud:

1. Go to **Settings** -> **Publishing**.
2. Under your live snapshot details, click **Unpublish & Delete**.
3. A warning modal will verify that you want to proceed.
4. Once confirmed, the system deletes the snapshot bundle and all uploaded assets from the cloud, immediately invalidating the guest link.
