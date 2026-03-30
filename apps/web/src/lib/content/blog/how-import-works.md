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

![Archive Controls and Import Button](https://assets.codexcryptica.com/images/blog/how-import-works/how-import-works-start.png)

You have a binder full of world-building — a Google Doc, a PDF, or a JSON export from years of notes. Transferring it manually to a new tool would take hundreds of hours of copying, pasting, and linking.

**The Codex Cryptica Import Pipeline** was built to solve this. In a single drag-and-drop (or copy-paste), it transforms your raw lore bible into an AI-extracted knowledge graph. Characters are named, locations are pinned, and factions are linked automatically.

---

## **The Big Picture: Analysis into Lore**

The import process is an intelligent transition that happens in three simplified steps:

1.  **Parsing** — Your file (or clipboard content) is read, and its text and images are extracted.
2.  **Synthesis** — The Oracle identifies characters, locations, and relationships, checking for existing entities to prevent duplicates.
3.  **Finalization** — Discovered entities are woven into your archive as connected Markdown files.

---

## **Step 1: Parsing — Meet Your File Where It Is**

![Drop Zone Interface](https://assets.codexcryptica.com/images/blog/how-import-works/import-dropzone.png)

The importer accepts the most common formats natively, including direct clipboard interaction:

| Format      | What Gets Extracted                                                       |
| ----------- | ------------------------------------------------------------------------- |
| **`.txt`**  | All text content, preserving paragraphs.                                  |
| **`.docx`** | Full text with formatting and embedded images.                            |
| **`.pdf`**  | Text layer and embedded raster images.                                    |
| **`.json`** | Structured exports from other tools for intelligent reconciliation.       |
| **Pasted**  | Raw text from your clipboard, converted from HTML for immediate analysis. |

Every format is handled by a specialized parser that hunts for both text and embedded images. Pictures from your PDF or Word files are saved to your archive automatically, ready for character portraits and maps.

---

## **Step 2: Synthesis — Intelligence in the Loop**

Once the text is extracted, the **Oracle Analyzer** reads your lore with the eye of an editor, identifying the core threads of your world:

- **Entity Identification**: It classifies subjects into `Character`, `Location`, `Item`, `Faction`, or `Lore`.
- **Synthesis**: It drafts one-sentence chronicles and expanded lore notes based on your text.
- **Relationship Discovery**: It detects links — like a character serving a specific faction — and materializes them as edges on your graph.
- **Archive Reconciliation**: It checks your existing archive to see if you already have a node for a discovered entity, offering to **merge** instead of duplicate.

![Importer Processing Interface](https://assets.codexcryptica.com/images/blog/how-import-works/import-processing.png)

For large files, the pipeline automatically splits the text into overlapping segments, ensuring even a 200-page lore bible is processed accurately and resumably.

---

## **Step 3: Finalization — Weaving Your Archive**

![Review Queue Interface](https://assets.codexcryptica.com/images/blog/how-import-works/import-review-queue.png)

The final step is where your lore becomes part of the permanent record. Discovered entities aren't just dumped into your files; they are woven in through a structured Review Queue that ensures your archive stays clean and organized:

- **Review Queue**: Before anything is saved, you get a focused workspace to **Accept**, **Merge**, or **Discard** every proposal. This is where you can edit the Oracle's summaries or link new people to existing locations.
- **Automatic Resumption**: Long imports can be interrupted by network drops or browser closures. The system indexes every segment locally, skipping what's finished and picking up exactly where it left off.
- **No Waste**: You never spend AI tokens on the same paragraph twice, and finalization only happens once you're satisfied with the results.

## **Key Safeguards**

| Scenario                  | What Happens                                     |
| ------------------------- | ------------------------------------------------ |
| Browser closed mid-import | Progress saved locally; resumable on next open.  |
| Same file imported twice  | System skips all completed segments immediately. |
| Entity already exists     | Flagged as a "merge candidate" for review.       |

---

## **Privacy First**

No file is ever uploaded to a Codex Cryptica server. This is a **local-first** pipeline: analysis runs via your browser and Gemini API, and the final results live exclusively in your local storage.

---

## **Ready to Import?**

To start your transition, open the **Archive Controls** in the sidebar and click **Import**.

![Archive Controls and Import Button](https://assets.codexcryptica.com/images/blog/how-import-works/how-import-works-start.png)

You can drop files (PDF, DOCX, TXT, JSON) directly into the window or **paste text** from your clipboard for instant analysis. Whether it’s a single character or a 200-page campaign, the system is ready to weave your lore into the knowledge graph.

### [Open the Importer →](/import)

_Read our guide on [the Lore Oracle's capabilities](/blog/oracle-capabilities) to see what else your AI Co-GM can do._
