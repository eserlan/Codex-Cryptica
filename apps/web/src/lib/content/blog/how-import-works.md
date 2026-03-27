---
id: how-import-works
slug: how-import-works
title: "From Lore Bible to Living Graph: How the Import Feature Works"
description: "A deep dive into the Codex Cryptica import pipeline — from dropping a PDF onto the screen to having a fully linked, AI-extracted knowledge graph ready for your next session."
keywords:
  [
    "RPG Lore Importer",
    "World Building Import",
    "AI Document Analysis",
    "DOCX PDF Import RPG",
    "Codex Cryptica Import",
    "World Building Knowledge Graph",
    "Lore Management Tool",
    "Dungeon Master Tools",
    "AI Entity Extraction",
    "Local-First RPG Tool",
  ]
publishedAt: 2026-03-27T14:00:00Z
---

![Codex Cryptica Import Pipeline](https://assets.codexcryptica.com/images/blog/how-import-works/import-hero.png)

You have a binder. Maybe it's a Google Doc, a Word file, a PDF exported from years of notes, or a JSON dump from a previous tool. It's a mountain of world-building that took hundreds of hours to create, and the idea of manually transferring it into a new system — entity by entity, link by link — is so daunting that you've been putting it off for months.

This is exactly the problem the **Codex Cryptica Import Pipeline** was built to solve.

In a single drag-and-drop, it takes your raw lore bible and turns it into a fully structured, AI-extracted knowledge graph: characters named, locations pinned, factions linked, and every connection surfaced. This post is a complete walkthrough of how that happens, from the moment you drop a file on the screen to the moment your graph lights up with new nodes.

---

## **The Big Picture: A Four-Stage Pipeline**

The import process is not a single action — it's a four-stage intelligent pipeline.

1. **Parsing** — Your file is opened and its raw text (and embedded images) is extracted.
2. **Analysis** — The Oracle (the AI engine) reads the extracted text, identifies entities, and discovers relationships.
3. **Deduplication & Progress Tracking** — The system checks whether this file (or any of its chunks) has been processed before, resumes where it left off, and prevents duplicate entries.
4. **Vault Import** — The discovered entities are written as properly formatted Markdown files into your vault, complete with YAML frontmatter and wiki-style links.

Each stage is designed to be resilient, resumable, and reversible.

---

## **Stage 1: Parsing — Meeting Your File Where It Is**

The importer doesn't demand that you convert your files first. It accepts the most common lore-keeping formats natively:

| Format | What Gets Extracted |
|--------|---------------------|
| **`.txt`** | All text content, preserving line breaks and paragraphs |
| **`.docx`** | Full text with formatting (headers, bold, lists) converted to Markdown; embedded images extracted as assets |
| **`.pdf`** | Text layer extracted; embedded raster images saved as assets |
| **`.json`** | Structured data parsed; key-value pairs and arrays converted to readable text for Oracle analysis |

Each format has a dedicated **parser** that implements a common interface with two responsibilities: first it declares which file types it handles, then it transforms the raw binary into a clean text payload plus a list of any extracted image assets.

### What Happens to Images?

Embedded images — a character portrait inside a Word file, a map clipped into a PDF — are extracted automatically and saved to your vault's local storage (OPFS). When the Oracle later creates an entity for the character that image belonged to, it inserts a Markdown image reference pointing directly to that saved asset. No manual upload required.

---

## **Stage 2: Analysis — The Oracle Reads Between the Lines**

Once the raw text is in hand, it's handed off to the **Oracle Analyzer** — the same AI engine that powers the Lore Oracle chat. This is where the real magic happens.

The Oracle doesn't just keyword-match. It reads the text the way a thoughtful editor would, looking for:

- **Distinct Entities**: Is this paragraph about a character? A location? An item? A piece of lore? The Oracle classifies each discovered subject into a `suggestedType`: `Character`, `Location`, `Item`, `Lore`, or `Unknown`.
- **Summaries & Content**: For each entity it finds, the Oracle drafts:
  - A **short chronicle** (a one-sentence summary)
  - A **detailed lore entry** (expanded notes in the Oracle's own words, referencing the source text)
  - The **full content block** (a complete Markdown document ready to be saved)
- **Relationship Discovery**: The Oracle identifies links between entities it has found — "this character works for this faction", "this item was last seen at this location" — and encodes them as `detectedLinks`. These become the edges of your knowledge graph.
- **Vault Reconciliation**: Before creating a new entity, the Oracle checks your existing vault. If discovered text refers to "Eldrin the Archivist" and a node named _Eldrin_ already exists, the analyzer flags it with a `matchedEntityId`, letting you **merge new information into an existing node** rather than spawning a duplicate.

### Chunking for Large Files

A 200-page lore bible can't be sent to an AI in a single request. The pipeline automatically splits large text payloads into **chunks** — overlapping segments sized to stay within the Oracle's context window. Each chunk is analyzed independently, and the results are merged into a single pool of discovered entities at the end.

This chunking is what makes the import process **resumable** (more on that below).

---

## **Stage 3: Deduplication & Progress Tracking — Never Lose Work**

Long imports fail. Networks drop. Browsers close. Without a resilience layer, a failure halfway through a 20-chunk document means starting over and re-spending the AI tokens you already paid for.

The import system solves this with **SHA-256 fingerprinting** and an **IndexedDB progress registry**.

### File Fingerprinting

When you select a file, the importer immediately computes a SHA-256 hash of its contents. This hash is the file's **permanent identity**. If you re-import the exact same file — even after closing the app and reopening it — the system recognizes it immediately.

### The Import Registry

Every import run creates (or updates) a record in a local IndexedDB store. This registry tracks:

- The file's hash and original filename
- How many chunks the file was split into
- Which chunks have been **completed** (Oracle returned valid results and they were saved)
- Which chunks are **in-progress** (sent to the Oracle but not yet confirmed)

When you re-select a file, the importer looks up its hash in the registry. If it finds a record, it skips all already-completed chunks and picks up exactly where it left off — no wasted tokens, no duplicate proposals.

### The Definition of Done

A chunk is only marked "completed" in the registry when **the Oracle has returned valid JSON** containing the discovered entities and the results have been saved locally. Partial network responses or malformed AI outputs are not counted as complete, so they will be safely retried.

### Duplicate Detection in the Review Queue

Once analysis is complete, discovered entities are surfaced in a **Review Queue** — a list of everything the Oracle found. If the same entity name is discovered in multiple chunks (which can happen with major characters who appear throughout a document), the system reconciles them. Entities flagged with a `matchedEntityId` appear in the queue as **"Link to Existing"** actions rather than "Create New," keeping your vault clean.

---

## **Stage 4: Vault Import — Writing the Graph**

After review, approved entities are written into your vault as properly structured **Markdown files with YAML frontmatter**.

A typical imported entity file looks like this:

```markdown
---
id: eldrin-the-archivist
title: Eldrin the Archivist
type: Character
tags: []
connections:
  - targetId: the-silver-archive
    label: "Keeper of"
  - targetId: the-arcane-council
    label: "Member of"
---

# Eldrin the Archivist

Eldrin is the head archivist of the Silver Archive, a centuries-old repository of magical research located beneath the city of Valdris. He joined the Arcane Council at age 40 after recovering a lost tome from the ruins of the Sunken Academy.

...
```

Notice that the `connections` array already contains edges to other entities discovered in the same import. The moment these files are written, the **Knowledge Graph** picks them up and renders them as nodes and edges — no manual linking needed.

### Where Files Are Stored

Your vault uses the browser's **Origin Private File System (OPFS)** — a secure, local-first storage layer that never touches an external server. Imported entities land in the same folder structure as hand-crafted nodes. They are indistinguishable from any other entity in your vault.

---

## **The Importer UI: A Focused, Distraction-Free Workspace**

The import feature lives at its own dedicated route (`/import`), launched as a focused popout window from the **Vault Controls** toolbar. It deliberately strips away the main navigation and sidebar — the same way a professional scanner app focuses your attention on the scan, not the desktop.

![Import Popout Window](https://assets.codexcryptica.com/images/blog/how-import-works/import-popout.png)

The UI guides you through the pipeline with three clear panels:

1. **Drop Zone**: Drag one or more files, or click to browse. Accepted formats are clearly listed. Multiple files are queued and processed **sequentially** — one at a time — to keep the Oracle focused and avoid rate-limit collisions.
2. **Progress View**: As each chunk is sent to the Oracle, a segmented progress bar updates in real time. Completed segments turn green; in-progress segments pulse. For a 20-chunk document, you watch the bar fill in 20 steps.
3. **Review Queue**: After analysis, every discovered entity is listed with its suggested type, a short summary, and one of three actions:
   - **Accept** — create a new vault node
   - **Merge** — fold the new content into an existing matched node
   - **Discard** — skip this entity

### Cross-Window Sync

Because the importer runs in a separate browser window, a **BroadcastChannel** keeps the main application in sync. The moment you accept an entity and it's written to your vault, the Knowledge Graph in your primary window updates automatically — no refresh required.

---

## **End-to-End Example: Importing a Lore Bible**

Let's walk through a real scenario.

**The file**: A 15-page PDF titled `northmarch-lore-bible.pdf` containing descriptions of 6 locations, 12 NPCs, 2 factions, and a historical timeline.

**Step 1 — Drop**: You open the importer and drop the file. The system computes its SHA-256 hash in milliseconds and checks the import registry. This is a new file — no prior record found.

**Step 2 — Parse**: The PDF parser extracts the text layer. Three embedded map images are saved to OPFS.

**Step 3 — Chunk**: The extracted text is ~18,000 characters. The system splits it into 5 overlapping chunks of ~4,000 characters each.

**Step 4 — Analyze**: Chunks are sent to the Oracle one at a time. The progress bar fills in 5 steps. The Oracle discovers 23 entity candidates total (some appeared in multiple chunks).

**Step 5 — Reconcile**: After deduplication, the queue shows 20 unique entities. The Oracle recognized that "The Black Sun Cult" mentioned in chunk 3 matches "Black Sun Faction" already in your vault — it's flagged as a merge candidate.

**Step 6 — Review**: You spend 4 minutes in the review queue. You accept 18, merge 1 (the Black Sun match), and discard 1 (a generic "old man" who isn't really a named entity).

**Step 7 — Write**: 19 Markdown files are written to your vault. 63 connection edges are created between them.

**Result**: You switch back to your main window. The Knowledge Graph has 19 new glowing nodes — all connected, all searchable, all ready.

What would have taken 3-4 hours of manual data entry took **under 10 minutes**.

---

## **Key Technical Safeguards**

| Scenario | What Happens |
|----------|-------------|
| Browser closed mid-import | Progress saved in IndexedDB; resumable on next open |
| Same file imported twice | Hash match detected; all completed chunks skipped |
| File re-saved with new content | Different hash = treated as a brand-new import |
| Oracle returns malformed JSON | Chunk marked as incomplete; retried on next run |
| Entity already exists in vault | Flagged as merge candidate, not a duplicate |
| Concurrent imports | Strict queue — one file processed at a time |

---

## **Privacy First**

The Oracle Analyzer sends text to the Gemini AI API for analysis. No file is ever uploaded to any Codex Cryptica server. The pipeline runs entirely in your browser: parsing happens locally, the import registry is stored in your local IndexedDB, and all vault files are written to your local OPFS. The only external call is the AI analysis request itself, and that requires your own API key.

---

## **Ready to Import Your World?**

The import pipeline is available now. Open the Vault Controls toolbar, click **Import**, and drop your lore bible into the window.

Whether it's a single character sheet or a 200-page campaign compendium, the system will meet you where you are — and have it woven into your graph before your next session.

### [Open the Importer →](/import)

_Interested in learning more about what the Oracle can do once your vault is populated? Read our guide on [the Lore Oracle's capabilities](/blog/oracle-capabilities)._
