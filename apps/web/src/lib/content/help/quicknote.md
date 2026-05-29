---
id: quicknote
title: QuickNotes & Fast Scratchpad
tags: [basics, quicknote, scratchpad, ai, elevation]
rank: 11
---

## Capture Fleeting Ideas Instantly

The **QuickNote Scratchpad** is designed to let you write down sudden brainstorms or game session observations immediately, without needing to navigate away from your active view or create formal wiki entries first.

### Key Features

- **Global Hotkey Toggle**: Press `Ctrl+I` (or `Cmd+I` on macOS) from anywhere in the app to slide open the glassmorphic QuickNote overlay.
- **Debounced Auto-Save**: Just start typing. Every keystroke is saved locally to your device's IndexedDB with under 150ms activation latency.
- **Floating Action Bubble (FAB)**: A glowing, interactive bubble sits in the bottom-right corner of your screen when active notes are present, pulsing to remind you of pending drafts.
- **glowing Counter Badges**: High-visibility orange badges on the leftmost Activity Bar `[⚡]` and compact draft pills in the Campaign Header count your active QuickNotes.

### Visual Brainstorming Integration

Your active, un-elevated QuickNotes aren't just hidden away in the scratchpad—they are seamlessly integrated into your visual tools:

- **Interactive Graph Nodes**: QuickNotes appear directly on your Cytoscape Knowledge Graph as **golden-amber dotted clickable nodes**.
- **Interactive Click & Double-Tap**: Clicking or double-tapping a QuickNote node on the graph canvas instantly opens the scratchpad focused on that note, avoiding any default mode interruptions.
- **Unified Global Search**: Your QuickNotes are searched alongside your wiki entities. Typing a keyword into the global search bar will instantly return matching notes, which open directly in the scratchpad editor when clicked.

### AI Entity Elevation

When you're ready to turn a fleeting draft into a formal wiki article, let the Lore Oracle do the heavy lifting:

1. Click **Elevate** (or the magic wand icon) in the QuickNote editor.
2. The AI reads your raw draft, retrieves semantic context from your vault, and structures the note into a rich draft entity (determining `Name`, `Type`, `Chronicle`, and `Lore`).
3. The newly generated draft is loaded into your sidebar review panel, complete with a `discoverySource` back-link referencing your original QuickNote.
4. When you click **Verify/Approve** on the Svelte sidebar draft banner, the original QuickNote is automatically archived, keeping your scratchpad perfectly clean.
