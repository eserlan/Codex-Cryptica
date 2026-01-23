# Contract: Vault Store API

**Type**: Svelte Store (Client-Side)
**Purpose**: Manage the in-memory state of the user's vault and handle persistence.

## Interface Definition

```typescript
// apps/web/src/lib/stores/vault.ts

import { type Writable } from 'svelte/store';
import type { Entity } from 'schema'; // Assumed from packages/schema

export interface VaultState {
  entities: Map<string, Entity>; // ID -> Entity
  status: 'idle' | 'loading' | 'saving' | 'error';
  lastError?: string;
  rootHandle?: FileSystemDirectoryHandle;
}

export interface VaultActions {
  /**
   * Initialize the vault by opening a directory picker.
   * Recursively reads all .md files.
   */
  openDirectory: () => Promise<void>;

  /**
   * Update an entity's content or metadata.
   * Triggers a debounced write to the file system.
   */
  updateEntity: (id: string, updates: Partial<Entity>) => void;

  /**
   * Create a new entity (file) in the vault.
   */
  createEntity: (type: Entity['type'], title: string) => Promise<string>; // Returns ID

  /**
   * Delete an entity (file).
   */
  deleteEntity: (id: string) => Promise<void>;
  
  /**
   * Force a reload from disk (manual sync).
   */
  refresh: () => Promise<void>;
}

// The store instance
export type VaultStore = Writable<VaultState> & VaultActions;
```

# Contract: Graph Store API

**Type**: Derived Store (Client-Side)
**Purpose**: Provide a reactive Cytoscape-compatible view of the Vault.

## Interface Definition

```typescript
// apps/web/src/lib/stores/graph.ts

import { type Readable } from 'svelte/store';
import type { ElementDefinition } from 'cytoscape';

export interface GraphState {
  elements: ElementDefinition[];
  stats: {
    nodeCount: number;
    edgeCount: number;
  };
}

// Derived from vault store
// $graph = derived(vault, ($vault) => transform($vault.entities))
export type GraphStore = Readable<GraphState>;
```
