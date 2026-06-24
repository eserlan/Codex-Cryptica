# Interface Contracts: Standalone Generator Session Hub

This document defines the interface contracts for the Standalone Generator Session Hub, covering pure functions, state stores, and data serialization boundaries.

## 1. Library Interface (`packages/generator-engine`)

The `generator-engine` package exposes pure helper functions for context selection, budgeting, and post-hoc provenance detection.

### `detectProvenance`

Given a generated entity's content and a set of active/offered session entities, determines which session entities were actually referenced.

```typescript
export interface ProvenanceMatchOptions {
  /** If true, requires word boundary boundary matching. Default true. */
  wholeWord?: boolean;
}

export function detectProvenance(
  content: {
    title?: string;
    summary?: string;
    lore?: string;
    content?: string;
  },
  offeredEntities: Array<{ id: string; title: string }>,
  options?: ProvenanceMatchOptions,
): string[]; // Returns array of used entity IDs
```

### `budgetContext`

Filters and prioritizes marked session entities to fit within LLM token/context limits.

```typescript
export interface BudgetOptions {
  maxEntities?: number; // Default 8
}

export function budgetContext(
  entities: Array<{
    id: string;
    createdOrder: number;
    reuseEnabled: boolean;
    pinned?: boolean;
  }>,
  options?: BudgetOptions,
): {
  offeredIds: string[];
  trimmed: boolean;
};
```

---

## 2. Web App Store Interface (`apps/web`)

The frontend manages live Svelte 5 state through a singleton `sessionHubStore`.

```typescript
export interface SessionEntity {
  id: string;
  type: string;
  title: string;
  summary?: string;
  content: string;
  lore?: string;
  labels: string[];
  status: string;
  reuseEnabled: boolean;
  pinned: boolean;
  createdOrder: number;
  provenanceUsedIds?: string[]; // Cached list of used entity IDs computed during generation
}

export class SessionHubStore {
  // Reactive runes
  readonly entities = $state<SessionEntity[]>([]);
  readonly isLoading = $state<boolean>(true);

  // Actions
  addEntity(
    draft: Omit<
      SessionEntity,
      "id" | "createdOrder" | "reuseEnabled" | "pinned"
    >,
  ): SessionEntity;
  removeEntity(id: string): void;
  toggleReuse(id: string): void;
  togglePin(id: string): void;
  clearSession(): void;

  // Save actions
  saveToVault(ids: string[]): Promise<void>; // Prepares localStorage handoff
}
```

---

## 3. Serialization Contracts (Handoffs)

### Session Storage Handoff (`sessionStorage` under `__codex_session_drafts`)

We migrate the existing `SessionDraft[]` array format to a versioned session hub state to prevent data corruption.

```json
{
  "version": 1,
  "entities": [
    {
      "id": "entity-uuid-1",
      "type": "character",
      "title": "Aric the Wise",
      "summary": "An aging wizard searcher...",
      "content": "### Who they are...",
      "lore": "### At a Glance...",
      "labels": ["rpg-character", "npc-generator"],
      "status": "draft",
      "reuseEnabled": true,
      "pinned": false,
      "createdOrder": 1
    }
  ],
  "provenanceRecords": {
    "entity-uuid-2": {
      "resultEntityId": "entity-uuid-2",
      "usedEntityIds": ["entity-uuid-1"],
      "offeredEntityIds": ["entity-uuid-1"],
      "trimmed": false
    }
  }
}
```

### Local Storage Import Handoff (`localStorage` under `__codex_pending_import`)

To preserve relationships during import, we extend the handoff payload to include connection instructions:

```typescript
export interface ImportPendingPayload {
  version: 1;
  drafts: Array<{
    id: string; // Temp session ID to map connections
    type: string;
    title: string;
    content: string;
    lore?: string;
    labels: string[];
    status: string;
  }>;
  connections?: Array<{
    sourceTempId: string;
    targetTempId: string;
    relationship: string;
  }>;
}
```
