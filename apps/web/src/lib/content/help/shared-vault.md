---
id: shared-vault
title: Joining a Shared Vault
description: Open a group link, type a name and keep a shared vault in sync with the rest of your group.
icon: icon-[lucide--users]
rank: 18
tags:
  ["shared vault", "group", "join", "link", "sync", "cloud", "collaboration"]
---

# Joining a Shared Vault

A vault's owner can share it with a group using one link. When you open that link, Codex Cryptica copies the whole vault to this device and keeps it in sync with the group. The vault on this device is yours: it keeps working offline, and it stays yours even if the link stops working.

## Join from a group link

1. Open the group link the owner sent you.
2. Read what joining means. Everyone with the link, the owner and every group member, can read and change the whole vault, including hidden and GM-only notes.
3. Type **Your name**. It is not checked, and it appears in the titles of conflict copies the group can see.
4. Choose **I understand and join**.

Nothing is sent, saved or created until you choose to join. **Not now** leaves everything as it was. The link is removed from the address bar as soon as the page opens, so it is not kept in your browser history.

If you already have this vault on the device, joining with the same or a new link reconnects that vault. It is not downloaded again.

## What the disclosure means

- **What is stored:** the shared copy holds the vault's entries, notes, labels, connections, images, maps and canvases, and your changes are uploaded to it.
- **Where:** on Cloudflare R2, Codex Cryptica's hosting provider. The copy is not end-to-end encrypted, so the provider can technically read it. It is never sold, forwarded or used to train AI.
- **What Codex Cryptica can see:** only backup details such as the vault title, size, number of entries and last backup time, not the contents.
- **Stopping:** you can stop syncing in **Settings → Vault → Cloud Backup** with **Turn off**.

## Working offline

You can keep editing without a connection. Your changes are saved on this device and sync when you are back online.

## When two people change the same thing

If you and someone else change the same part of an entry, Codex Cryptica keeps both. Your version becomes a copy titled **Title (Name's version)**, using the name you typed, so the group can see whose it was and decide which to keep.

## Deleted entities and the trash

When someone in the group deletes an entity, it disappears for everyone, but it is kept for up to 30 days, subject to the 50 MB trash limit. Any member can bring it back.

- **Undo:** when another member's delete reaches you, a message such as "Mara deleted Old Dock" appears with an **Undo** button. It stays for a few seconds.
- **Trash panel:** in **Settings → Vault → Cloud Backup**, the **Trash** section lists what was deleted, who deleted it, when, and how many days are left. Choose **Restore** to bring an entity back for the whole group.
- **After 30 days** a deleted entity is removed for good.
- **When the trash is full:** the group's trash has a 50 MB size limit. When it fills up, the oldest items lose their restorable content early and show "Can't be restored". A warning notice appears when syncing or rolling back causes older items to lose their content early.
- **Edited before the delete arrived:** if you changed an entity before someone else's delete reached you, Codex Cryptica keeps your version.

A restored entity keeps its own links, but entities that linked to it before it was deleted do not get those links back.

## What only the owner can do

Only the owner can replace the link, turn sharing off, delete the shared copy and manage restore points. In **Settings → Vault → Cloud Backup** you see a note saying you joined as a member, and none of those controls.

## Roll back to an earlier day (owner)

The owner can roll the whole group back to how the vault looked on an earlier day. Open **Settings → Vault → Cloud Backup**, find **Restore points** and press **Roll back to this day** next to a date. One restore point is kept for each day the group makes changes, for 30 days.

Before anything changes you see a summary with three numbers:

- **Will change:** items that exist both then and now but differ. They go back to how they were.
- **Will come back from the trash:** items that were deleted since that day. They return.
- **Will go to the trash:** items that did not exist that day. They are not lost: they go to the shared trash and can be restored for up to 30 days, subject to the 50 MB trash limit.

Nothing is erased. Members receive the result on their next sync and do not need to rejoin. Changes a member has made but not yet synced are kept by the usual rules. Session journals and adventures are not rolled back, because they are never shared with the group.

If a rollback fails part-way, nothing in the vault changes, though a picture file that was missing may be put back.

## Maps and canvases

Maps and canvases sync as whole items. A map's background image and fog-of-war mask travel with it.

- **Same map changed by two people:** the first to sync stays as it is. The other version is kept as a copy named "Name (Your name's version)", with its own background and mask, so nothing is lost.
- **Deleted maps and canvases** go to the trash with a **Map** or **Canvas** label, and can be restored like any other item.
- **Open on your screen:** a map or canvas you have open is not replaced while you are using it. The change arrives after you close it.

## Not shared with the group

Session journals and adventures are never shared with the group. They stay on each device, and a member who joins does not receive the owner's.

New images on entries stay on this device for now, and the Cloud Backup panel says so. Your other changes still sync.

## "This group link no longer works"

This appears when the owner has replaced the link or turned sharing off. Syncing stops, but your vault stays fully usable, and your changes keep being recorded on this device.

1. Ask the owner for the new group link.
2. Open it and choose **I understand and join**.

The same vault is reconnected without downloading it again, and the changes you made in the meantime sync.

If the message says the shared vault already has the most devices it allows, ask the owner to replace the link.
