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
