# Data Model: Context-Aware Entity Generator

This document defines the transient and persistent data structures used in the Context-Aware Entity Generator.

## Data Structures

### 1. Context Generation Request Configuration (Transient)

Used in the configuration modal to build the request.

```typescript
export interface RelatedEntityGenerationConfig {
  sourceEntityId: string;
  targetType: string; // "character" | "faction" | "location" | "item" | "event" | "creature" | "note" | "surprise"
  relationship: string; // suggested label or custom text
  customInstructions?: string; // extra guidance for the AI
}
```

### 2. Compiled Prompt Context (Transient)

Compiled context passed into the prompt builder.

```typescript
export interface ConnectedEntityContext {
  title: string;
  type: string;
  relation: string; // The relationship label (e.g. "ally", "headquarters")
  content: string; // The chronicle/summary of the connected entity
}
```

### 3. Draft Entity (Transient Review State)

The schema returned by the AI and bound to the modal's review form.

```typescript
export interface DraftRelatedEntity {
  name: string;
  type: string; // One of the standard categories
  summary: string; // Initial chronicle content
  description: string; // Initial lore content
  labels: string[]; // List of suggested labels
  plotHook?: string; // Optional plot hook
  relationshipBack: string; // Label for the link from Source → New Entity
}
```

## Persistent Vault Updates

When the user clicks "Create Entity" in the review screen:

1. **New Entity Creation**: Create the entity using `vault.createEntity({ title: draft.name, type: draft.type, content: draft.summary, lore: draft.description, labels: draft.labels })`.
2. **Graph Connection**: Create a directed edge using `vault.addConnection(sourceEntityId, newEntityId, draft.relationshipBack)`.
