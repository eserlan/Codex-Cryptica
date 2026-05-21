# Contract: QuickNoteService

Interface for managing fleeting ideas and their lifecycle.

## API

```typescript
export interface QuickNote {
  id?: string;
  vaultId: string;
  content: string;
  status: "active" | "elevated" | "archived";
  createdAt: number;
}

export class QuickNoteService {
  /**
   * Saves a new note or updates an existing one.
   */
  save(note: Partial<QuickNote>): Promise<string>;

  /**
   * Retrieves all active notes for the current vault.
   */
  getActiveNotes(vaultId: string): Promise<QuickNote[]>;

  /**
   * Elevates a note using the Oracle engine.
   * Marks note as 'elevated' upon success.
   */
  elevate(id: string): Promise<void>;

  /**
   * Archives a note (hides from scratchpad/graph).
   */
  archive(id: string): Promise<void>;
}
```
