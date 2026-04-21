# Contract: DraftingEngine Service

The `DraftingEngine` is a new internal service in `packages/oracle-engine` responsible for identifying entities within a stream of chat text.

## Interface

```typescript
export interface IDraftingEngine {
  /**
   * Parses text to find potential entities.
   * Returns a list of proposals for both new and existing entities.
   */
  propose(
    text: string,
    context: DiscoveryContext,
  ): Promise<DiscoveryProposal[]>;

  /**
   * Synthesizes multiple proposals into a single coherent draft.
   */
  synthesize(proposals: DiscoveryProposal[]): DraftedContent;
}

interface DiscoveryContext {
  existingEntities: Record<string, Entity>;
  activeEntityId?: string;
  history: ChatMessage[];
}
```

## UI Contract: Detection Chips

`ChatMessage.svelte` will render proposals using a new `DiscoveryChip.svelte` component.

| Prop        | Type                | Action                             |
| ----------- | ------------------- | ---------------------------------- |
| `proposal`  | `DiscoveryProposal` | Displays "Found: [Name] ([Type])"  |
| `onCommit`  | `() => void`        | Saves to vault as 'active' status. |
| `onPreview` | `() => void`        | Opens entity preview for editing.  |
| `onDiscard` | `() => void`        | Removes chip from UI.              |
