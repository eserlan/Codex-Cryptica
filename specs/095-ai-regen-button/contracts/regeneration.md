# Contract: Regeneration Service

## Interface: IRegenerationService

```typescript
export interface IRegenerationService {
  /**
   * The current active draft for an entity.
   */
  readonly pendingDraft: RegenerationDraft | null;

  /**
   * Whether a regeneration is currently in progress.
   */
  readonly isGenerating: boolean;

  /**
   * Triggers the AI regeneration process for a given entity.
   */
  regenerate(entityId: string): Promise<void>;

  /**
   * Commits the pending draft to the vault.
   */
  acceptDraft(): Promise<void>;

  /**
   * Clears the pending draft without saving.
   */
  discardDraft(): void;
}
```

## AI Response Contract (Internal)

The Oracle MUST return a structured response following this pattern:

```markdown
### CHRONICLE

[1-2 sentences of atmospheric, player-facing summary]

### LORE

[2-3 paragraphs of detailed, host-only world-building facts and secrets]
```

The `OracleParser` will be updated to extract these sections reliably.
