# Contract: QuickNoteService

Interface for managing fleeting ideas and their lifecycle.

## API

```typescript
export interface QuickNoteRecord {
  id?: number;
  vaultId: string;
  content: string;
  status: "active" | "elevated" | "archived";
  createdAt: number;
}

export class QuickNoteService {
  /**
   * Retrieves all active, un-elevated quick notes for a specific vault.
   * Sorts from newest to oldest by creation date.
   */
  getAllActiveNotes(vaultId: string): Promise<QuickNoteRecord[]>;

  /**
   * Retrieves a single quick note by its ID.
   */
  getNoteById(id: number): Promise<QuickNoteRecord | undefined>;

  /**
   * Persists a quick note to IndexedDB.
   * Handles both inserting new notes and updating existing ones.
   */
  saveNote(
    note: Omit<QuickNoteRecord, "id"> & { id?: number },
  ): Promise<number>;

  /**
   * Permanently deletes a quick note from the IndexedDB store.
   */
  deleteNote(id: number): Promise<void>;

  /**
   * Archives a quick note (marking it archived), removing it from active lists.
   */
  archiveNote(id: number): Promise<void>;

  /**
   * Elevates a quick note (marks it elevated), signifying it has been converted
   * into a proper wiki entity in the vault.
   */
  elevateNote(id: number): Promise<void>;
}
```
