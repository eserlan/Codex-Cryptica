# Data Model: Propose Entities

## Entity Proposal Model (Transient State)

Used for rendering proposed entities in the UI before they are accepted.

```typescript
interface ProposedEntity {
  title: string; // The extracted bolded text
  sourceEntityId: string; // The ID of the entity where it was found
  context: string; // The surrounding text/sentence (optional, for AI generation context)
}
```

No new persisted entities are needed, as this system feeds into the existing `Entity` creation flow.
