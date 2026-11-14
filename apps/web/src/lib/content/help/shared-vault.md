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

## What only the owner can do

Only the owner can replace the link, turn sharing off, delete the shared copy and manage restore points. In **Settings → Vault → Cloud Backup** you see a note saying you joined as a member, and none of those controls.

## Maps, canvases and images stay on this device for now

Changes to maps, canvases and new images are not shared yet. They stay on this device, and the Cloud Backup panel says so. Your other changes still sync.

## "This group link no longer works"

This appears when the owner has replaced the link or turned sharing off. Syncing stops, but your vault stays fully usable, and your changes keep being recorded on this device.

1. Ask the owner for the new group link.
2. Open it and choose **I understand and join**.

The same vault is reconnected without downloading it again, and the changes you made in the meantime sync.

If the message says the shared vault already has the most devices it allows, ask the owner to replace the link.
