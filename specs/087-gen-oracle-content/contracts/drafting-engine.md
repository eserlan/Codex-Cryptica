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
  automationPolicy?: OracleAutomationPolicy;
}

interface OracleAutomationPolicy {
  entityDiscovery: "off" | "suggest" | "auto-create";
  connectionDiscovery: "off" | "suggest" | "auto-apply";
}
```

## UI Contract: Detection Chips

`ChatMessage.svelte` will render proposals behind a compact expandable "Found lore" control, using `DiscoveryChip.svelte` for each proposal once expanded.

| Prop        | Type                | Action                             |
| ----------- | ------------------- | ---------------------------------- |
| `proposal`  | `DiscoveryProposal` | Displays "Found: [Name] ([Type])"  |
| `onCommit`  | `() => void`        | Saves to vault as 'active' status. |
| `onPreview` | `() => void`        | Opens entity preview for editing.  |
| `onDiscard` | `() => void`        | Removes chip from UI.              |

### Discovery Group Behavior

| State       | Required Behavior                                                       |
| ----------- | ----------------------------------------------------------------------- |
| Collapsed   | Show a single "Found lore" pill with the proposal count.                |
| Expanded    | Show individual `DiscoveryChip` actions for each valid proposal.        |
| Suggest     | Start collapsed to avoid interrupting the reading flow.                 |
| Auto-create | Record activity through the activity log rather than showing chip spam. |

The Drafting Engine MUST suppress structured response labels such as `Name`, `Type`, `Chronicle`, `Lore`, `Content`, and `Summary` before proposals reach this UI contract.

## Automation Contract

Oracle discovery orchestration MUST evaluate `OracleAutomationPolicy` before mutating records or graph connections.

| Policy Field          | Value         | Required Behavior                                                   |
| --------------------- | ------------- | ------------------------------------------------------------------- |
| `entityDiscovery`     | `off`         | Do not emit discovery chips or auto-archive chat discoveries.       |
| `entityDiscovery`     | `suggest`     | Emit discovery chips only; persist records only after user commit.  |
| `entityDiscovery`     | `auto-create` | Persist discovered records/updates as drafts according to settings. |
| `connectionDiscovery` | `off`         | Do not run connection analysis after Oracle-driven commits.         |
| `connectionDiscovery` | `suggest`     | Seed Feature 040 proposals only; do not create graph edges.         |
| `connectionDiscovery` | `auto-apply`  | Apply eligible connection proposals and notify the user.            |

Manual discovery-chip commits and deterministic `/create` commands count as explicit entity creation, but they do not count as explicit connection creation. They MUST still respect `connectionDiscovery`.
