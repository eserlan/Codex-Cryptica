---
id: importing
title: Importing Notes
tags: [import, oracle, resume]
rank: 5
---

# Importing Content

Codex Arcana can transform your unstructured notes into a structured Knowledge Graph using the Lore Oracle.

## How it Works

1. **Upload**: Drag and drop your `.txt`, `.docx`, or `.json` files.
2. **Analysis**: The Oracle breaks your documents into chunks and analyzes them to find characters, locations, and items.
3. **Review**: You review the discovered entities and their relationships before adding them to your vault.

## Resilient Imports

Large documents can take time to process. The system automatically tracks your progress:

- **Automatic Resume**: If you close the app or lose connection, re-selecting the same file will resume exactly where you left off.
- **Content-Aware**: We use unique file fingerprints (hashes) to remember progress even if you rename your files.
- **Visual Tracking**: The segmented progress bar shows you exactly which parts of your file have been analyzed, skipped, or are currently active.

## Manual Restart

If you want to re-analyze a file from scratch, click the **Restart** button in the import dialog to clear its saved progress.
