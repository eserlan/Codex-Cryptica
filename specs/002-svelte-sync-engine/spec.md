# SPEC-002: Svelte-Native Sync Engine (The "Pulse")

## 1. The Goal
Define the reactive pipeline using Svelte Stores to bridge the Markdown Files and the Cytoscape Graph.

## 2. The Architectural Pattern: "The Single Store of Truth"
Instead of separate states, we will create a custom store (e.g., vault.js) that manages the relationship between local files and graph nodes.

### Component Svelte Implementation
*   **The Vault Store**: A writable store containing the collection of all Entity objects.
*   **The Graph Derived Store**: A derived store that automatically transforms the Vault data into Cytoscape-ready JSON (elements).
*   **The File Watcher**: Using the File System Access API, a listener that updates the Vault store whenever a file on disk is changed.

## 3. Technical Spec: The Entity Schema (Svelte Interface)
```typescript
// src/lib/types.ts
export interface Entity {
  id: string;
  type: 'npc' | 'location' | 'event' | 'item';
  title: string;
  content: string; // The Markdown body
  metadata: {
    tags: string[];
    connections: Connection[]; // Explicit relationships from YAML
    coordinates?: { x: number; y: number }; // Graph positions
  };
}

export interface Connection {
  targetId: string;
  type: string;
  label?: string;
}
```

## 4. Logic: The "Reactive Loop"
This is how we satisfy the Article II (Relational Primacy):

*   **Input**: User edits a note in the Svelte-Tiptap component.
*   **Detection**: As the content store updates, a $derived effect (Svelte 5) or a derived store (Svelte 4) scans for [[Wiki-Links]].
*   **Graph Update**: The graphStore detects a new connection and calls cy.add() or updates the existing edge.
*   **Auto-Save**: Svelte’s $effect or subscribe triggers a debounced write to the local file system (OPFS).

## 5. Why Svelte wins here:
*   **No Virtual DOM**: Svelte updates the specific Cytoscape instance directly via fine-grained reactivity.
*   **Size**: Your PWA bundle will be significantly smaller, improving the "Instant Load" feel for mobile GMs.
*   **Clarity**: Svelte’s syntax for stores is far more readable for a "SpecKit" contributor than Redux/Zustand boilerplate.