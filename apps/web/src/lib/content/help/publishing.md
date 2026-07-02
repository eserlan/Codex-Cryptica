---
id: publishing
title: Sharing and Publishing Worlds
tags: [publishing, guest, share, cloud, r2, worlds, directory, discovery]
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

## The Visibility Ladder

Sharing and discovery are two separate, owner-controlled consent levels — enabling one does not enable the other:

1. **Private** — the default. Only you and vault editors can access the world.
2. **Shared Link** — after you publish a snapshot (above), anyone with the guest link can view a read-only copy. The link is not discoverable anywhere; you must send it yourself.
3. **Public Listing** — an additional, separate opt-in that lists your published world in [**Explore Worlds**](/worlds), Codex Cryptica's public directory, so anyone can browse and find it without a link.

## Listing a World in Explore Worlds

Public listing requires an active Shared Link (you must publish a snapshot first):

1. Open **Settings** -> **Publishing**.
2. Fill in the **Public Listing** section: a title, short description, and optional labels/cover image for the directory entry.
3. Click **List Publicly**. Your world now appears in [Explore Worlds](/worlds).
4. Use **View in Explore Worlds** to see your live directory listing at any time.

### What becomes visible

A public listing shows only what you entered in the listing form (title, description, labels, cover image) plus a link to the same redacted, player-safe guest snapshot described above — it never exposes anything beyond what's already in your Shared Link snapshot.

### Delisting

Click **Delist World** in the Public Listing section at any time. This removes the world from Explore Worlds immediately; it does not unpublish or delete your Shared Link snapshot — players with the direct link can still access it. To revoke the shared link too, unpublish separately (above).
