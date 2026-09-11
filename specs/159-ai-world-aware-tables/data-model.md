# Data Model: AI-Generated World-Aware Random Tables

**Feature**: `159-ai-world-aware-tables`  
**Date**: 2026-08-15  
**Spec**: [spec.md](./spec.md)

---

## 1. Transient Generation Types (`packages/generator-engine`)

These types describe the generation request, grounding context, and transient candidate entries before they are committed to the vault.

```typescript
/**
 * Context provided to the random table generator.
 */
export interface RandomTableGenerationContext {
  /** The theme or topic of the table (e.g. "Docklands Encounters", "Smuggler Rumors") */
  topic: string;
  /** Number of entries to generate (2-50, defaults to standard dice sizes like 6, 8, 10, 12, 20) */
  count: number;
  /** Freeform user instructions or campaign notes taking highest priority */
  campaignContext?: string;
  /** Names of existing tables and decks available for sub-table reference emission */
  availableTables?: string[];
  /** Relevant entities retrieved from the active vault for lore grounding */
  worldEntities?: Array<{
    title: string;
    category?: string;
    summary?: string;
  }>;
  /** The active visual/genre theme for stylistic tone matching */
  theme?: string;
}

/**
 * A generated candidate entry awaiting user review.
 */
export interface CandidateTableEntry {
  /** Unique transient client ID for UI selection & editing tracking */
  id: string;
  /** Generated entry text (may contain {table_name} nested references) */
  text: string;
  /** Inferred default weight (usually 1) */
  weight: number;
  /** Discovered entity names referenced in the text */
  matchedEntities?: string[];
  /** Discovered sub-table names referenced in the text */
  matchedSubTables?: string[];
  /** Selection status in the review preview (defaults to true) */
  selected: boolean;
}

/**
 * Structured output schema from the AI model.
 */
export interface GeneratedTableOutput {
  /** Suggested table title based on the topic */
  title: string;
  /** Suggested short description */
  description?: string;
  /** List of generated row texts */
  entries: Array<{
    text: string;
    weight?: number;
  }>;
}
```

---

## 2. Persistent Storage Model (`schema` / `random-source-engine`)

No changes are made to the persistent data model. Generated entries compile directly into standard `TableEntry` records within standard `Table` sources.

```typescript
// Existing Table & TableEntry schema from #2247:
export interface TableEntry {
  id: string;
  text: string;
  weight?: number;
  range?: {
    start: number;
    end: number;
  };
}

export interface Table {
  kind: "table";
  id: string;
  name: string;
  description?: string;
  selectionMode: "weighted" | "ranged";
  entries: TableEntry[];
  created: number;
  modified: number;
}
```

---

## 3. Entity Lifecycle & Staging Pipeline

```mermaid
flowchart LR
    A[User Prompt & Context] --> B[Search Orchestration: Retrieve Top Vault Entities]
    B --> C[Generator Engine: Prompt Assembly with Pinned Nouns & Table Registry]
    C --> D[AI Provider / Proxy Call]
    D --> E[Parse to CandidateTableEntry[]]
    E --> F[Interactive Review Modal: Inline Edit / Toggle]
    F --> G[Save as New Table OR Append to Active Table]
```
