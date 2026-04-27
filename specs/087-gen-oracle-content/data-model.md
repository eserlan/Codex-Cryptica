# Data Model: Proactive Entity Discovery

## Entity Schema Extensions

The existing `Entity` type in `packages/schema` will be updated:

- **status**: (`'active' | 'draft'`) Defaults to `'active'`.
  - `active`: Fully verified lore entry. Included in all searches and graph views.
  - `draft`: Auto-generated content awaiting review or created via Auto-Archive. Excluded from main graph and global search by default.
- **discoverySource**: (Optional `string`) The ID of the chat message that triggered this discovery.
- **lastUpdated**: (`number`) Timestamp of last modification.

## PendingDraft (Transient Session Data)

Used by the `DraftingEngine` to track identified entities _before_ they are even saved as drafts in the vault.

| Field            | Type       | Description                                                    |
| ---------------- | ---------- | -------------------------------------------------------------- | -------------------------------------------- |
| id               | string     | Stable ID based on normalized name (for merging across turns). |
| title            | string     | Identified entity name.                                        |
| type             | EntityType | identified type (character, location, etc.).                   |
| description      | string     | The extracted text block.                                      |
| sourceMessageIds | string[]   | List of message IDs contributing to this draft.                |
| state            | 'new'      | 'update'                                                       | Whether it matches an existing vault entity. |

## DiscoveryProposal

The object passed to the UI to render "Detection Chips".

```typescript
interface DiscoveryProposal {
  entityId?: string; // Present if 'update'
  title: string;
  type: EntityType;
  draft: {
    lore: string;
    chronicle: string;
  };
  confidence: number;
}
```

## OracleAutomationPolicy

Persisted user preference that controls how much the Oracle may change vault records and graph connections during chat-driven discovery.

```typescript
interface OracleAutomationPolicy {
  entityDiscovery: "off" | "suggest" | "auto-create";
  connectionDiscovery: "off" | "suggest" | "auto-apply";
}
```

### Entity Discovery Modes

- **off**: Do not create discovery chips, smart updates, or auto-archived drafts from normal Oracle chat.
- **suggest**: Show discovery chips and smart updates, but wait for explicit user commit before changing vault records.
- **auto-create**: Save discovered entities or updates according to the Auto-Archive rules and mark generated records for review.

### Connection Discovery Modes

- **off**: Do not run connection analysis after Oracle-driven create/update actions.
- **suggest**: Run the existing Feature 040 connection proposer and persist pending proposals for review.
- **auto-apply**: Run the proposer and apply eligible high-confidence proposals automatically, then notify the user how many connections were created.

### Defaults

The default policy MUST be:

```typescript
{
  entityDiscovery: 'suggest',
  connectionDiscovery: 'suggest',
}
```

This default lets the Oracle help users discover records and relationships without automatically mutating the graph.
