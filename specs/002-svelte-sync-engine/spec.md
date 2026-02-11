# SPEC-002: Svelte-Native Sync Engine (The "Pulse")

## 1. The Goal

Define the reactive pipeline using Svelte Stores to bridge the Markdown Files and the Cytoscape Graph.

## 2. The Architectural Pattern: "The Single Store of Truth"

Instead of separate states, we will create a custom store (e.g., `vault.svelte.ts`) that manages the relationship between local files and graph nodes using Svelte 5 Runes.

### Component Svelte Implementation

- **The Vault Store**: A global class using `$state` containing the collection of all Entity objects, with all file I/O directed to the Origin Private File System (OPFS).
- **The Graph Derived Store**: A `$derived` property that automatically transforms the Vault data into Cytoscape-ready JSON (elements).
- **User-Directed Sync**: A method in the `VaultStore` that allows the user to export their entire OPFS vault to a local directory using the File System Access API.

## 3. Technical Spec: The Entity Schema (Svelte Interface)

```typescript
// src/lib/types.ts
export interface Entity {
  id: string;
  type: "npc" | "location" | "event" | "item" | "faction";
  title: string;
  tags: string[];
  connections: Connection[];
  content: string; // The Markdown body
  lore?: string; // Extended lore & rich notes
  image?: string;
  metadata: {
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

- **Input**: User edits a note in the Svelte-Tiptap component.
- **Detection**: As the content updates, a `$derived` effect scans for `[[Wiki-Links]]`.
- **Graph Update**: The graph state detects a new connection and calls `cy.add()` or updates the existing edge.
- **Auto-Save**: The store triggers a debounced write to the local file system (OPFS).

## 5. Why Svelte wins here:

- **No Virtual DOM**: Svelte updates the specific Cytoscape instance directly via fine-grained reactivity.
- **Size**: Your PWA bundle will be significantly smaller, improving the "Instant Load" feel for mobile GMs.
- **Clarity**: Svelte 5 Runes syntax is far more readable and concise than Redux/Zustand boilerplate.
