---
id: cloud-backup
title: Codex Cryptica Cloud Backup
description: Keep one restorable copy of a vault in Codex Cryptica Cloud, with automatic saves and a recovery key you control.
icon: icon-[lucide--cloud-upload]
rank: 17
tags: ["cloud", "backup", "cloud save", "recovery", "restore", "sync", "vault"]
---

# Codex Cryptica Cloud Backup

Codex Cryptica Cloud Backup keeps a restorable copy of your current vault in Codex Cryptica Cloud. It is **off by default** and nothing is uploaded until you choose Codex Cryptica Cloud as this vault's cloud destination and confirm the consent screen.

Use it when you want Codex to keep an up-to-date off-device copy without relying on a Google Drive account or a folder managed by your operating system.

## Turn Cloud Backup on

1. Open **Settings → Vault**.
2. Find **Cloud copy**.
3. Choose **Codex Cryptica Cloud**.
4. Read the **Before you turn on cloud backup** consent screen.
5. Click **I understand — turn it on**.

The first save creates the cloud backup and a **recovery key**. Use **Copy recovery key** and keep it somewhere outside this browser or device.

A vault can use only **one app-managed cloud destination at a time**: either **Google Drive** or **Codex Cryptica Cloud**. Both can restore a whole-vault copy, so Codex does not let them act as competing sources of truth for the same vault.

## What is uploaded

Cloud Backup stores the vault data needed to rebuild your world, including entities and notes, labels, maps, canvases, and session journals.

For vault-owned local files, the current backup payload includes these asset classes:

- an entity's **image** and **thumbnail**;
- a map's background **asset**; and
- a map's **fog-of-war mask**.

Other referenced files are not automatically collected. In particular, **sound-bite audio files are not currently backed up**, so keep a separate copy of audio you need to preserve. Remote URLs are kept as references rather than downloaded into the backup.

The copy is hosted on third-party cloud infrastructure. It is **not end-to-end encrypted**, so Codex Cryptica and its hosting provider are technically able to read the stored data. The Cloud Backup consent screen is the authoritative summary shown before anything leaves your device.

Cloud Backup is for restoring your vault. It is not a publishing or sharing feature and it does not make the vault public.

## Automatic Cloud Save

Once Cloud Backup is on, normal durable changes to the vault are tracked and saved to the existing cloud backup automatically. After the initial full backup, Codex can send only the changed items rather than rebuilding the entire upload every time.

The Cloud Backup panel reports states such as:

- **Saved to cloud**
- **Changes pending…**
- **Saving…**
- **Offline — changes will sync later**
- **Sync failed — retrying…**
- **Sync paused — another device updated this backup**

You can also use **Save to cloud** to push changes manually when you want an immediate backup.

If Codex cannot read an entity body or one of the local image/map assets that Cloud Backup supports, it reports that the backup is partial rather than silently pretending everything was stored.

## Recovery key

The recovery key identifies the backup and proves that you are allowed to restore or update it. There are no Codex accounts and there is no ordinary password-reset flow for Cloud Backup.

Keep the key somewhere safe. If you lose it, recovery may not be possible. Support can use limited backup metadata such as a vault title, size, and last-backup time to help identify a backup, but support cannot read the vault contents through the support lookup.

## Restore a backup

Open **Settings → Vault → Cloud copy → Codex Cryptica Cloud** and choose the restore/load option.

- If this browser already knows about one of your backups, you can select it directly.
- To restore a backup made on another device, paste its recovery key.
- **Load from cloud** restores into a **new local vault**. It does not silently replace the vault you currently have open.

If backed-up assets cannot be recovered, the restore still completes but reports **how many** assets are missing. It does not currently list each missing asset by name.

## Attach an existing local vault to the same backup

If you already have a local copy of the vault on another device and want both devices to use the **same** cloud backup, choose **Attach this vault to an existing backup** and paste the recovery key from the device that already owns the backup.

Attaching does not first download and merge the cloud copy. It links this local vault to that backup so the next save writes this vault to the existing cloud destination. Use **Load from cloud** instead when you want to restore the cloud copy into a new vault.

## Turn it off or delete it

These are different actions:

- **Turn off Cloud Backup** stops future saves, but the existing stored backup remains available for recovery.
- **Delete cloud backup** permanently removes the stored copy. Your local vault is not deleted.

## How this differs from the other backup options

- **Codex Cryptica Cloud Backup**: app-managed off-device copy, automatic Cloud Save after you opt in, recovery-key based restore.
- **Google Drive**: app-managed copy in your own Google Drive; its Save/Load controls are documented separately under **Google Drive Cloud Sync**.
- **Local folder mirroring**: writes to a folder you choose on your computer; if that folder is synchronised by Google Drive, Dropbox, iCloud, or another desktop client, that synchronisation is handled by your operating system/provider rather than by Codex Cloud Backup.
- **Portable Backup**: a downloadable `.codex.zip` snapshot you create manually and keep wherever you choose.

These options solve similar safety problems in different ways. For the app-managed **Cloud copy** setting, choose either Google Drive or Codex Cryptica Cloud for a given vault.
