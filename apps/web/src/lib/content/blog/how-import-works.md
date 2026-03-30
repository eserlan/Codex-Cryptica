---
id: how-import-works
slug: how-import-works
title: "From Lore Bible to Living Graph: How the Import Feature Works"
description: "A deep dive into the Codex Cryptica import pipeline — from dropping a PDF onto the screen to having a fully linked, AI-extracted knowledge graph ready for your next session."
keywords:
  - "RPG Lore Importer"
  - "World Building Import"
  - "AI Document Analysis"
  - "DOCX PDF Import RPG"
  - "Codex Cryptica Import"
  - "World Building Knowledge Graph"
  - "Lore Management Tool"
  - "Dungeon Master Tools"
  - "AI Entity Extraction"
  - "Local-First RPG Tool"
publishedAt: 2026-03-27T14:00:00Z
---

![Codex Cryptica Import Pipeline](https://assets.codexcryptica.com/images/blog/how-import-works/import-hero.png)

You have a binder. Maybe it's a Google Doc, a Word file, a PDF exported from years of notes, or a JSON dump from a previous tool.

It's a mountain of world-building that took hundreds of hours to create. The idea of manually transferring it into a new system—entity by entity, link by link—is so daunting that you've been putting it off for months.

This is exactly the problem the **Codex Cryptica Import Pipeline** was built to solve.

In a single drag-and-drop, it takes your raw lore bible and transforms it into a structured, AI-extracted knowledge graph. Characters are named, locations are pinned, and factions are linked. This post is a complete walkthrough of how your raw text becomes a living network of nodes.

---

## **The Big Picture: A Four-Stage Pipeline**

The import process is not a single action—it's a four-stage intelligent pipeline.

1. **Parsing** — Your file is opened and its raw text (and embedded images) is extracted.
2. **Analysis** — The Oracle (the AI engine) reads the extracted text, identifies entities, and discovers relationships.
3. **Deduplication & Progress Tracking** — The system checks whether this file has been processed before, resumes where it left off, and prevents duplicate entries.
4. **Vault Import** — The discovered entities are woven into your vault as properly formatted Markdown files, complete with YAML metadata and wiki-style links.

Each stage is designed to be resilient, resumable, and reversible.

---

## **Stage 1: Parsing — Meeting Your File Where It Is**

The importer doesn't demand that you convert your files first. It accepts the most common lore-keeping formats natively:

| Format      | What Gets Extracted                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **`.txt`**  | All text content, preserving line breaks and paragraphs.                                                                     |
| **`.docx`** | Full text with formatting (headers, bold, lists) converted to Markdown; embedded images extracted as assets.                 |
| **`.pdf`**  | Text layer extracted; embedded raster images saved as assets.                                                                |
| **`.json`** | Ingests structured exports from other tools, mapping legacy data to your active vault schema for intelligent reconciliation. |

Every file format is handled by a specialized **parser**. Its job is to transform raw binary data into a clean text payload while simultaneously hunting for embedded image assets to salvage for your library.

### What Happens to Images?

Embedded images—a character portrait inside a Word file or a map clipped into a PDF—are extracted automatically and saved to your vault's local storage (OPFS).

When the Oracle later creates an entity for the character that image belonged to, it inserts a Markdown image reference pointing directly to that saved asset. No manual upload required.

---

## **Stage 2: Analysis — The Oracle Reads Between the Lines**

Once the text is extracted, it’s handed to the **Oracle Analyzer**—the same intelligence that powers your Lore Oracle chat. This is where the synthesis begins.

The Oracle doesn't merely scan for keywords. It reads your lore with the eye of a seasoned editor, identifying the core threads of your world:

- **Distinct Entities**: Is this paragraph about a character? A location? The Oracle classifies discovered subjects into a `suggestedType`: `Character`, `Location`, `Item`, `Lore`, or `Unknown`.
- **Summaries & Content**: For each entity, the Oracle drafts a short chronicle (one-sentence summary), expanded lore notes in its own words, and a complete Markdown document.
- **Relationship Discovery**: The Oracle detects subtle links within the narrative—recognizing that a character serves a specific faction or that an item is bound to a lost location. These are encoded as `detectedLinks` and automatically materialized as edges on your graph, often with `[[wiki-style]]` references injected into the content.
- **Vault Reconciliation**: Before creating a new entity, the Oracle checks your existing vault. If discovered text refers to "Eldrin the Archivist" and a node named _Eldrin_ already exists, the analyzer flags it with a `matchedEntityId`, letting you **merge new information into an existing node** rather than spawning a duplicate.

### Chunking for Large Files

A 200-page lore bible can't be processed in a single request. The pipeline automatically splits large payloads into **chunks**—overlapping segments sized to stay within the Oracle's context window.

Each chunk is analyzed independently, and the results are merged into a single pool of discovered entities at the end. This chunking is what makes the import process **resumable**.

---

## **Stage 3: Deduplication & Progress Tracking — Never Lose Work**

Long imports fail. Networks drop. Browsers close. Without a resilience layer, a failure halfway through a 20-chunk document means starting over and re-spending AI tokens.

The import system solves this with **SHA-256 fingerprinting** and an **IndexedDB progress registry**.

### File Fingerprinting

When you select a file, the importer immediately computes a SHA-256 hash of its contents. This hash is the file's **permanent identity**. If you re-import the exact same file later, the system recognizes it immediately.

### The Import Registry

Every import run updates a record in a local IndexedDB store. This registry tracks the file's hash, how many chunks it was split into, and which chunks have been **completed**.

When you re-select a file, the importer looks up its hash. If it finds a record, it skips all completed chunks and picks up exactly where it left off. No wasted tokens, no duplicate proposals.

### Duplicate Detection in the Review Queue

Once analysis is complete, entities are surfaced in a **Review Queue**. If the same entity appears in multiple chunks, the system reconciles them. Entities flagged with a `matchedEntityId` appear in the queue as **"Link to Existing"** actions, keeping your vault clean.

---

## **Stage 4: Vault Import — Woven into the Knowledge Graph**

After review, approved entities are written into your vault as structured **Markdown files with YAML frontmatter**.

Notice that the `connections` array in the metadata already contains edges to other entities discovered in the same import. The moment these files are written, the **Knowledge Graph** picks them up and renders them as nodes—no manual linking needed.

### Where Files Are Stored

Your vault uses the browser's **Origin Private File System (OPFS)**—a secure, local-first storage layer that never touches an external server. Imported entities land in the same folder structure as hand-crafted notes.

---

## **The Importer UI: A Focused Workspace**

The import feature lives at its own dedicated route (`/import`), launched as a focused popout window. It deliberately strips away the main navigation—the same way a professional scanner app focuses your attention on the scan, not the desktop.

![Import Interface Hero](https://assets.codexcryptica.com/images/blog/how-import-works/import-hero.png)

1. **Drop Zone**: Drag files or click to browse. Multiple files are processed **sequentially** to keep the Oracle focused.
   ![Import Dropzone](https://assets.codexcryptica.com/images/blog/how-import-works/import-dropzone.png)
2. **Progress View**: As each chunk is processed, a segmented progress bar updates in real time.
   ![Import Processing](https://assets.codexcryptica.com/images/blog/how-import-works/import-processing.png)
3. **Review Queue**: Every discovered entity is listed with its suggested type and a short summary. You can **Accept**, **Merge**, or **Discard** each one.
   ![Import Review Queue](https://assets.codexcryptica.com/images/blog/how-import-works/import-review-queue.png)

### Cross-Window Sync

Because the importer runs in a separate window, a **BroadcastChannel** keeps the main application in sync. The moment you accept an entity, the Knowledge Graph in your primary window updates automatically.

---

## **End-to-End Example: Importing a Lore Bible**

**The file**: A 15-page PDF titled `northmarch-lore-bible.pdf` containing 6 locations, 12 NPCs, and 2 factions.

**Step 1 — Drop**: You drop the file. The system checks the registry; it's a new file.
**Step 2 — Parse**: The PDF parser extracts the text. Three embedded map images are saved to OPFS.
**Step 3 — Chunk**: The text is split into 5 overlapping chunks.
**Step 4 — Analyze**: Chunks are sent to the Oracle. The progress bar fills in 5 steps.
**Step 5 — Reconcile**: The Oracle recognizes that "The Black Sun Cult" matches a faction already in your vault.
**Step 6 — Review**: You spend 4 minutes in the queue. You accept 18 entities and merge the cult match.
**Step 7 — Ignite the Graph**: 19 Markdown files are written. 63 connection edges are created.

**Result**: Your Knowledge Graph has 19 new glowing nodes—all connected, all searchable, all ready. What would have taken 4 hours of manual entry took **under 10 minutes**.

---

## **Key Technical Safeguards**

| Scenario                      | What Happens                                         |
| ----------------------------- | ---------------------------------------------------- |
| Browser closed mid-import     | Progress saved in IndexedDB; resumable on next open. |
| Same file imported twice      | Hash match detected; all completed chunks skipped.   |
| Entity already exists         | Flagged as merge candidate, not a duplicate.         |
| Oracle returns malformed JSON | Chunk marked as incomplete; retried on next run.     |

---

## **Privacy First**

The Oracle Analyzer sends text to the Gemini AI API for analysis. No file is ever uploaded to a Codex Cryptica server. The pipeline runs entirely in your browser: parsing happens locally, the registry is stored in IndexedDB, and files are written to OPFS.

---

## **Ready to Import Your World?**

Open the Vault Controls toolbar, click **Import**, and drop your lore bible into the window. Whether it's a single character sheet or a 200-page compendium, the system will meet you where you are.

![Starting the Importer](https://assets.codexcryptica.com/images/blog/how-import-works/how-import-works-start.png)

### [Open the Importer →](/import)

_Read our guide on [the Lore Oracle's capabilities](/blog/oracle-capabilities) to see what you can do once your vault is populated._
