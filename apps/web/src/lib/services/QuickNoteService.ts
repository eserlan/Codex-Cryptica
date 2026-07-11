import {
  entityDb,
  type EntityDb,
  type QuickNoteRecord,
} from "../utils/entity-db";
import { type Clock, systemClock } from "../utils/runtime-deps";

/**
 * Service to manage local persistence of QuickNote fleeting scratchpad entries.
 * Uses constructor-based Dependency Injection for robust testing.
 */
export class QuickNoteService {
  private db: EntityDb;
  private clock: Clock;

  constructor(db: EntityDb = entityDb, clock: Clock = systemClock) {
    this.db = db;
    this.clock = clock;
  }

  /**
   * Retrieves all active, un-elevated quick notes for a specific vault.
   * Sorts from newest to oldest by creation date.
   */
  async getAllActiveNotes(vaultId: string): Promise<QuickNoteRecord[]> {
    if (!vaultId) return [];
    const notes = await this.db.quickNotes
      .where("vaultId")
      .equals(vaultId)
      .and((note) => note.status === "active")
      .toArray();

    return notes.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Retrieves a single quick note by its ID.
   */
  async getNoteById(id: number): Promise<QuickNoteRecord | undefined> {
    return this.db.quickNotes.get(id);
  }

  /**
   * Persists a quick note to IndexedDB.
   * Handles both inserting new notes (generates createdAt) and updating existing ones.
   */
  async saveNote(
    note: Omit<QuickNoteRecord, "id"> & { id?: number },
  ): Promise<number> {
    const toSave: QuickNoteRecord = {
      ...note,
      createdAt: note.createdAt || this.clock.now(),
    };

    const id = await this.db.quickNotes.put(toSave);
    return id;
  }

  /**
   * Permanently deletes a quick note from the IndexedDB store.
   */
  async deleteNote(id: number): Promise<void> {
    await this.db.quickNotes.delete(id);
  }

  /**
   * Archives a quick note (marking it archived), removing it from active lists.
   */
  async archiveNote(id: number): Promise<void> {
    await this.db.quickNotes.update(id, { status: "archived" });
  }

  /**
   * Elevates a quick note (marks it elevated), signifying it has been converted
   * into a proper wiki entity in the vault.
   */
  async elevateNote(id: number): Promise<void> {
    await this.db.quickNotes.update(id, { status: "elevated" });
  }
}

/** Default singleton instance of the QuickNoteService. */
export const quickNoteService = new QuickNoteService();
export type { QuickNoteRecord };
