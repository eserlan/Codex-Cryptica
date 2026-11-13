---
id: adventure-artwork
title: Adventure Artwork
description: Illustrate locations in Adventure Mode with your Vault images or curated AI artwork, keep exact pictures, and manage offline caches and backups.
icon: icon-[lucide--image]
tags: [adventure, artwork, images, illustrations, cache, offline, backup]
---

# Adventure Artwork

Adventure Mode can display a compact scene illustration for your current location without delaying narration or changing your turn flow.

## Where illustrations come from

Illustrations follow a fixed precedence order:

1. **Disabled or dismissed**: If you turn off illustrations in Adventure Artwork settings or dismiss artwork for the current place, no image is shown until you turn it back on or restore automatic selection.
2. **Your explicit choice**: If you chose **Keep this picture** or **Choose another**, that exact kept choice is shown. Kept pictures are pinned by exact snapshot or digest so later updates to a Vault image or catalogue metadata never silently swap what you kept.
3. **Available Vault image**: If the current place is linked to a Vault entity with its own local image, Adventure Mode uses that Vault image automatically.
4. **Curated catalogue match**: Otherwise, Adventure Mode checks the local curated catalogue using only player-visible cues (place type, visible tags, and world genre). Matching runs locally in your browser—it never sends private notes or narrative text to an AI service, and it works even when **AI Disabled** is turned on.
5. **Text-only fallback**: If no image matches or the browser is offline without a cached copy, play continues normally in text-only mode.

## AI provenance and credits

Curated stock illustrations in the public catalogue are team-generated AI artwork that has been human-reviewed for public safety and quality. Every displayed illustration shows an **AI illustration** label and a **Credits** summary when available.

## Controls

- **Keep this picture**: Saves a private immutable snapshot of the current image in your Vault (`images/artwork_*`) or pins the exact catalogue asset digest so your choice survives edits or deletions to the original entity image.
- **Choose another**: Opens the artwork chooser to pick a different eligible illustration from the curated catalogue.
- **Dismiss**: Hides artwork for the current place while remembering your automatic history.
- **Restore automatic**: Clears your explicit override or dismissal so Adventure Mode returns to your Vault image or automatic matching.
- **Show adventure illustrations**: Turns illustration display and automatic public image loading on or off for this device without erasing your saved choices.

## Storage, offline availability, and Cloud Backup

- **Private Vault snapshots** (from **Keep this picture**) live in your Vault's private `images/` folder and are included in **owner `.codex.zip` backups**. They are never uploaded to public hosting and are stripped from guest/public exports.
- **Disposable public cache**: Curated catalogue images are cached locally in your browser (`codex-adventure-artwork-v1`) within a finite automatic budget (up to 32 MiB, evicted least-recently-used). Pinning a catalogue image with **Keep** preserves its exact identity, not a guarantee that the browser cache will keep its bytes offline indefinitely. You can clear the disposable public cache from Artwork Settings without affecting your saved choices or private Vault snapshots.
- **Cloud Backup**: Adventure sessions and kept private artwork are **not** included in Codex Cryptica Cloud Backup by default. To back them up to the cloud, open **Settings → Vault → Codex Cryptica Cloud** and explicitly accept the **Include adventures and kept artwork** disclosure. You can disable this inclusion and remove remote adventure data at any time without deleting your local adventures or snapshots.
