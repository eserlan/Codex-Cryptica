---
id: importing
title: Importing Notes
tags: [import, oracle, resume]
rank: 8
---

# Importing Content

Codex Cryptica can transform your unstructured notes into a structured Knowledge Graph using the Lore Oracle.

## How it Works

1. **Upload**: Drag and drop your `.txt`, `.docx`, or `.json` files.
2. **Analysis**: The Oracle breaks your documents into chunks and analyzes them to find characters, locations, and items.
3. **Review**: You review the discovered entities and their relationships before adding them to your vault.

## Import Files

If you already have Codex Cryptica files on your computer — from another vault, a folder you saved, or a portable backup you unzipped — you can bring specific ones straight in, no AI analysis needed:

- **Drag and drop**: Drag individual files, or a whole folder, onto the **Import Files** area.
- **Choose Files**: Use the button to pick files from the traditional file upload dialog instead.
- **Review before anything is written**: You'll see exactly what was picked up, how many files will be added, and how many already exist in this vault (those are always skipped — this flow never overwrites, updates, or merges existing entities).
- **Images come along automatically**: If a dropped file references an image, that image (and its thumbnail) is included automatically whenever it was part of the same drop — for example when you drag in a whole folder. If it wasn't, you'll be prompted to add the image file directly or, in browsers that support it, grant access to the source folder so it can be found there.

## Dedicated Importer

For uninterrupted world-building, clicking **IMPORT** in the top menu or the Entity Palette opens a dedicated, distraction-free popout window.

- **Seamless Sync**: Any entities you import or review in this popup are instantly saved and synchronized back to your main graph in real-time. No manual refresh required!

## Import a Kanka Campaign

Kanka's structured campaign export works without an AI key:

1. In Kanka, request a **JSON campaign export** and download the generated ZIP.
2. Drop the ZIP directly into Codex's importer. Do not unpack or convert it first.
3. Review the entities, labels, attributes, explicit relations, and linked images before committing them to the current vault.

Codex imports a copy and does not change the campaign in Kanka. Kanka permissions, dashboards, family-tree layouts, plugins, themes, and bookmarks are not part of Kanka's standard export and cannot be recreated by this import.

## Resilient Imports

Large documents can take time to process. The system automatically tracks your progress:

- **Automatic Resume**: If you close the app or lose connection, re-selecting the same file will resume exactly where you left off.
- **Content-Aware**: We use unique file fingerprints (hashes) to remember progress even if you rename your files.
- **Visual Tracking**: The segmented progress bar shows you exactly which parts of your file have been analyzed, skipped, or are currently active.

## Manual Restart

If you want to re-analyze a file from scratch, click the **Restart** button in the import dialog to clear its saved progress.

## Related Blog Posts

- [How Import Works: Local-First Migration](/blog/how-import-works) — Comprehensive guide to converting notes into structured knowledge graphs.
