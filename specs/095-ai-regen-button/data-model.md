# Data Model: AI Regeneration

## Transient State (RegenerationDraft)

This state is stored in `RegenerationService` and is NOT persisted until the user accepts it.

```typescript
export interface RegenerationDraft {
  entityId: string;
  chronicle: string; // Proposed player-facing content
  lore: string; // Proposed GM-facing lore
  timestamp: number;
}
```

## Persisted State (Entity)

No schema changes required. Uses existing fields:

- `content`: Stores the "Chronicle".
- `lore`: Stores the "Lore".

## UI State (apps/web)

Managed via `$state` in `RegenerationService`:

- `pendingDraft`: `RegenerationDraft | null`
- `isGenerating`: `boolean`
- `error`: `string | null`
