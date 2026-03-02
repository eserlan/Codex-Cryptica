---
id: comprehensive-help-guide
slug: comprehensive-help-guide
title: "Comprehensive Help Guide"
description: "The complete manual for Codex Cryptica. Learn how to manage vaults, sync your lore, use the spatial canvas, and master the Lore Oracle."
keywords:
  [
    "Codex Cryptica Guide",
    "RPG Campaign Management",
    "Lore Oracle Commands",
    "Spatial Canvas Tutorial",
    "Google Drive Sync RPG",
    "World Building Software",
    "Data Sovereignty for GMs",
  ]
publishedAt: 2026-03-01T12:00:00Z
---

# Comprehensive Help Guide

Welcome to the ultimate guide for **Codex Cryptica**. This manual is designed to take you from a first-time user to a master world-builder, ensuring your campaign lore remains private, organized, and logically connected.

## Table of Contents

- [Phase 1: Getting Started](#phase-1-getting-started)
- [Phase 2: Building Your World](#phase-2-building-your-world)
- [Phase 3: Visualizing and Connecting](#phase-3-visualizing-and-connecting)
- [Phase 4: Advanced Mastery](#phase-4-advanced-mastery)
- [Phase 5: Privacy and Best Practices](#phase-5-privacy-and-best-practices)

---

## Phase 1: Getting Started

Welcome to the Archive! Codex Cryptica is a **local-first, privacy-centric** world-building tool designed to give you absolute sovereignty over your lore. Whether you are running a sprawling high-fantasy epic or a neon-soaked cyberpunk mystery, the Codex adapts to your story.

### Your First Vault

The "Vault" is the heart of your campaign. It is a folder on your computer where all your notes are saved as standard **Markdown (.md)** files. This means you own your data—no cloud accounts or proprietary formats required.

1. **Enter the Workspace**: From the landing page, click "Enter Workspace".
2. **Open a Vault**: Click the folder icon in the sidebar. You can select an existing folder or create a new one.
3. **Switching Campaigns**: If you have multiple stories, you can switch between them by clicking the vault name at the top-left of the interface.

![Entering the Workspace](https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/images/help-blog/welcome.png)
_The Welcome Screen: your entry point into the Codex._

---

## Phase 2: Building Your World

Once your vault is open, it’s time to start drafting. In Codex Cryptica, we move beyond simple text files by using a structured data model that the AI can understand.

### Creating Your First Entry

To add something new to your world, look for the **+ NEW CHRONICLE** button in the top header.

1.  **Click + NEW CHRONICLE**: This opens a quick-creation form.
2.  **Title Your Lore**: Enter the name of your character, location, or item (e.g., "Eldrin the Wise").
3.  **Choose a Category**: Use the dropdown to select the type (e.g., Character, Location, Faction).
4.  **Add**: Hit enter or click 'ADD' to create the file and open the editor.

![Entity Creation Flow](https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/images/help-blog/new%20chronicle.png)
_The quick-creation form: starting your first chronicle._

### Core Building Blocks: Entities

Everything in your world is an **Entity**. Each entity is composed of two parts:

1.  **Attributes**: The main text content. This is your public-facing description or player-facing handout.
2.  **Mythos**: Hidden metadata. This is where you keep secret motivations, stat blocks, or GM-only notes. The Oracle uses this "Lore" to provide context-aware answers that players shouldn't know yet.

![Entity Anatomy](https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/images/help-blog/entity-sidebar.png)
_The Entity Editor: balancing public attributes with secret mythos._

### Organizing Your Archive

As your vault grows, you can use **Categories** and **Tags** to keep things organized. You can define custom categories like "Planets" or "Magic Items" in the **Settings** menu. This is the cornerstone of your **Campaign Preparation**, allowing you to structure your world's logic before the first session.

### Zen Mode (Focus View)

When you need to dive deep into a single entity without distractions from the rest of your workspace, you can open it in **Zen Mode**. This expands the entity into a focused, full-screen overlay where you can read its chronicle, view its inventory, and manage its connections in a distraction-free environment.

![Zen Mode](https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/images/help-blog/zen-mode.png)
_The Zen Mode: perfect for deep dives into a single entity._

### Keeping Your Vault in Sync

While your data stays local by default, we offer powerful ways to keep your notes in sync across your machine and the cloud:

1. **Local Folder Sync (Primary)**: Link your internal app database with a physical folder on your machine. This is the recommended way to manage your lore, as it allows you to edit your notes in external tools like **Obsidian** or VS Code and see those changes reflected instantly in the Codex.
2. **Google Drive Mirroring (Advanced)**: For those who need multi-device access, you can enable Google Drive Sync in the **Settings**. This creates a private mirror of your vault in your personal cloud, ensuring you can pick up your campaign from any machine.

![Sync Settings](https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/images/help-blog/sync.png)
_Manage your cloud and local sync settings in the Cloud Sync tab._

---

## Phase 3: Visualizing and Connecting

The true power of Codex Cryptica is that it links your notes **geographically**, **relationally**, and **strategically**.

### The Knowledge Graph (Relational)

The graph view reveals the "connective tissue" of your world. It automatically maps out relationships between NPCs, factions, and locations as you write them.

- **Connect Mode (`C`)**: Visually drag connections from the core node to any other entity in the web to define new relationships.
- **Labels (`L`)**: Toggle the visibility of the text labels (titles) on the entity nodes across your graph canvas.
- **Active Session Management**: Use the graph as your digital "Battle Map" for information. During play, right-click nodes and toggle their visibility to players using the **Fog of War** system. Press the **Eye Icon** in the control bar to instantly see the full GM view of your world.

![Relational Linking](https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/images/help-blog/connections.png)
_Connect Mode: Drawing the lines between destiny and location._

### Map Mode (Geographic)

Plot your lore onto actual geographic images. Whether it’s a world map or a tactical dungeon floor plan, Map Mode grounds your story in physical space.

- **Pins**: Double-click the map to drop a pin and link it to an existing entity.
- **Active Session Management**: As your players explore, hold **Alt + Click-Drag** to paint away the fog on your world map, revealing only what they can see. If you reveal too much, hold **Alt + Shift + Click-Drag** to hide the area again. If they enter a tavern, click the pin to dive into a floor plan sub-map instantly.

![Fog of War](https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/images/help-blog/map.png)
_Revealing the unknown: using Fog of War during an active session._

### The Spatial Canvas (Strategic)

While the graph is automated, the **Canvas** is a manual workspace for complex brainstorming. Think of it as your digital "Murder Board" for tracking conspiracy theories, family trees, or quest flowcharts.

- **Persistent Layouts**: Every position and connection you draw is manually placed and saved to `.canvas` files.
- **MiniMap**: Navigate your massive canvases with a theme-aware MiniMap for seamless control.

The canvas provides an infinite, pannable workspace where you can visually organize your knowledge base.

- **Adding Entities:** Right-click anywhere on the empty canvas to spawn a new entity at that exact location.
- **Quick Editing:** Hover over any entity on the canvas and click the small pencil icon to edit its chronicle text directly, without needing to open the full modal.
- **Drawing Connections:** Hold `Ctrl` (or `Cmd` on Mac) and drag from anywhere inside one entity card to another to create a new thematic link between them.

![Canvas](https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/images/help-blog/canvas.png)
_The Canvas: your personal workspace for organizing your knowledge base._

---

## Phase 4: Advanced Mastery

The Lore Oracle is your primary interface for interacting with the AI. It can answer questions about your world, generate content, and manage your vault.

### Mastering Slash Commands

The Oracle supports several interactive commands to speed up your workflow:

- **`/draw [subject]`**: Triggers AI image generation (e.g., `/draw a portrait of Eldrin`).
- **`/create "Name" as "Type"`**: Instantly draft a new entity (e.g., `/create "Iron Spire" as Location`).
- **`/connect "A" label "B"`**: Quickly create a connection (e.g., `/connect "Eldrin" is the mentor of "Kaelen"`).
- **`/merge "Source" into "Target"`**: Combine duplicate entities. Source notes are appended to the target, and connections are re-mapped.
- **`/help`**: Show a list of all available commands.

![Oracle Interaction](https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/images/help-blog/oracle-draw.png)
_The Lore Oracle: consulting the archives for hidden truths._

### Proactive Lore Intelligence

- **AI Suggestion Engine**: As you work, the Oracle silently scans for hidden connections and suggests them at the bottom of the detail panel.
- **Image Generation (Advanced)**: For those with an 'Advanced' AI tier, look for the **DRAW** button in sidepanels to instantly visualize entities based on their lore.
- **Node Merging**: Use the Oracle to synthesize content. Pick two or more entries and use the **AI Synthesis** strategy to have the Oracle rewrite the combined content into a single, cohesive narrative.

### Importing External Content

Codex Cryptica can transform your existing notes into structured entries. That can be pdfs, text files, or the plain text itself.

![Importing External Content](https://assets.codexcryptica.com/cdn-cgi/image/format=auto,quality=80/images/help-blog/import.png)
_Importing external content into Codex Cryptica._

- **Automated Discovery**: The Oracle analyzes your uploads to find NPCs and locations.
- **Resilient Imports**: If an import process stops, re-selecting the file will resume exactly where you left off.

### Helpful Tools & Utilities

The Codex includes several tools to refine your management experience:

- **Era Date Picker**: Perfect for vast timelines. Instead of typing years, click through centuries and decades to set dates. This is essential for **Campaign Preparation** when mapping historical events or lifespans.

<!-- ![Era Date Picker](/blog/assets/064/v11-date-picker.png) -->

_Navigating time: setting the chronological bounds of your world._

- **Lite Mode (No AI)**: If you prefer a non-AI experience, you can disable intelligence features in **Settings**. This limits the Oracle to utility slash commands only.
- **Demo Mode**: If you are new, you can explore the tool with pre-loaded sample data. This is the best way to test the Knowledge Graph before creating your own vault. Any changes made in Demo Mode are transient unless you click **Save as Campaign**.

---

## Phase 5: Privacy and Best Practices

At its core, Codex Cryptica is built to give you **absolute sovereignty** over your world-building.

### Your Data is Yours

We follow a **Local-First Architecture**. This means your notes are never uploaded to our servers. They live on your device, in your browser (OPFS), and in your local folders.

- **Offline Availability**: The core app works entirely without an internet connection.
- **Privacy Intelligence**: AI processing via the Oracle respects your data sovereignty.

### Obsidian and External Editors

Because your vault is just a folder of Markdown files, you can use other tools to manage your notes. Many Game Masters use the **Obsidian** integration to write their lore and then use Codex Cryptica for the interactive graph and AI features.

Synchronization is **bidirectional**:

- **Internal → External**: Updates made in the app are mirrored to your folder.
- **External → Internal**: Edits made in your folder (even with other apps) are imported back into the Codex automatically.

### Scaling Your Archives

The Codex is designed to handle thousands of entities. To keep things smooth:

- **Web Worker Engine**: We process heavy tasks like search indexing and graph layout in the background.
- **Granular Chronicles**: Breaking your lore into smaller, linked entities improves graph readability and AI grounding.

---

### Ready to build your story?

[Enter the Codex →](/)

_Read our [Guide to Data Sovereignty](gm-guide-data-sovereignty) for a deep dive into privacy._

_Read our blog about [Spatial Intelligence](spatial-intelligence) to learn more about how the graph, the map and the canvas work together._
