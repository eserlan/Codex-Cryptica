# SPEC-001: Core Entity & Relationship Schema

## 1. The "Atomic Entity" Definition

Every piece of lore (NPC, Location, Item) is an Entity. In a local-first PWA, an Entity is a single Markdown file with a structured YAML header. This ensures the data is "Human Readable" but "Machine Actionable."

### File Structure Example (/vault/npcs/elara.md):

```yaml
---
id: "eid-7721"
type: "npc"
title: "Elara the Seer"
tags: ["mystic", "high-elf", "quest-giver"]
connections:
  - { target: "loc-silver-tower", type: "located_in", strength: 1 }
  - { target: "npc-king-thorin", type: "secret_advisor", strength: 0.8 }
lore: |
  The full backstory of Elara...
  (Encrypted/Lazy-loaded content)
---
# Elara the Seer
Elara lives in the Silver Tower and possesses the Gift of Sight...
```

## 2. The Relationship Engine (Cytoscape Integration)

The PWA will parse these YAML headers to build the elements array required by Cytoscape.js.

- **Nodes**: Represent the Entities.
- **Edges**: Represent the connections array.
- **Live-Sync**: When a user types `[[Link]]` in the Tiptap editor, a background process (Web Worker) must update the connections array in the YAML and trigger a `cy.add()` event in the graph.

## 3. Technical Requirements (The "First Commit" Stack)

To get this spec off the ground, the initial repository should be initialized with:

| Component       | Technology                        | Role                                                    |
| :-------------- | :-------------------------------- | :------------------------------------------------------ |
| **Framework**   | **SvelteKit**                     | Core PWA structure and routing.                         |
| **Styling**     | **Tailwind CSS v4**               | Utility-first styling with modern PostCSS pipeline.     |
| **State**       | **Svelte 5 Runes**                | Managing state with $state and $derived signals.        |
| **Database**    | **Native File System API (OPFS)** | Direct local-first persistence without intermediate DB. |
| **Graph UI**    | **Cytoscape.js**                  | The primary spatial navigation and relationship view.   |
| **Text Editor** | **Tiptap**                        | Framework-agnostic editor core with custom extensions.  |

## 4. Implementation Milestone 1: The "Sync Loop"

The goal of the first sprint is to achieve the "Triangle of Truth":

1.  **Edit Text**: User writes `[[King Thorin]]` in the editor.
2.  **Update Graph**: A node for "King Thorin" appears instantly in the Cytoscape view.
3.  **Persist File**: The YAML in `elara.md` is updated on the local file system.

## 5. Repository Structure Suggestion

```text
/
├── apps/
│   └── web/ (SvelteKit PWA)
├── packages/
│   ├── graph-engine/ (Cytoscape logic)
│   ├── editor-core/ (Framework-agnostic Tiptap extensions)
│   └── schema/ (TypeScript interfaces & pure functional logic)
└── docs/
    └── spec-001-core.md
```
