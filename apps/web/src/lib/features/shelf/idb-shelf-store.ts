import type {
  ImportJournal,
  ShelfEntry,
  ShelfEntrySummary,
  ShelfStore,
} from "@codex/entity-shelf";
import { getDB } from "$lib/utils/idb";

/**
 * The `ShelfStore` port over IndexedDB.
 *
 * `shelf_entries` is the one store in `CodexCryptica` that is not vault-scoped:
 * it has no `vaultId` key and no `by-vault` index, because being readable from
 * whichever vault is open is what makes the Shelf work at all (FR-003).
 */
export class IdbShelfStore implements ShelfStore {
  constructor(private readonly db: typeof getDB = getDB) {}

  /**
   * Deliberately projects rather than returning whole records: entries carry
   * image and audio blobs, and the list has to stay cheap to render however
   * much is on the shelf (FR-022).
   */
  async listEntries(): Promise<ShelfEntrySummary[]> {
    const db = await this.db();
    const entries = await db.getAll("shelf_entries");
    return entries
      .sort((a, b) => b.shelvedAt - a.shelvedAt)
      .map(
        ({
          entityRecord: _record,
          assets: _assets,
          statSheetTemplate: _schema,
          presentationTemplate: _presentation,
          referencedTitles: _referencedTitles,
          ...summary
        }) => summary,
      );
  }

  async getEntry(id: string): Promise<ShelfEntry | null> {
    const db = await this.db();
    return (await db.get("shelf_entries", id)) ?? null;
  }

  /**
   * Re-shelving the same entity replaces its snapshot rather than adding a
   * near-duplicate: the Shelf is a transfer buffer, not a version history
   * (FR-009, invariant I2).
   */
  async putEntry(entry: ShelfEntry): Promise<void> {
    const db = await this.db();
    const tx = db.transaction("shelf_entries", "readwrite");

    for (const existing of await tx.store.getAll()) {
      if (
        existing.sourceVaultId === entry.sourceVaultId &&
        existing.sourceEntityId === entry.sourceEntityId
      ) {
        await tx.store.delete(existing.id);
      }
    }

    await tx.store.put(entry);
    await tx.done;
  }

  async removeEntry(id: string): Promise<void> {
    const db = await this.db();
    await db.delete("shelf_entries", id);
  }

  async clear(): Promise<void> {
    const db = await this.db();
    await db.clear("shelf_entries");
  }

  /** Sums the denormalised sizes, so this never has to read a blob (FR-025). */
  async totalBytes(): Promise<number> {
    const db = await this.db();
    const entries = await db.getAll("shelf_entries");
    return entries.reduce((sum, entry) => sum + entry.byteSize, 0);
  }

  async writeJournal(journal: ImportJournal): Promise<void> {
    const db = await this.db();
    await db.put("shelf_journal", journal);
  }

  async readJournals(): Promise<ImportJournal[]> {
    const db = await this.db();
    return db.getAll("shelf_journal");
  }

  async deleteJournal(importId: string): Promise<void> {
    const db = await this.db();
    await db.delete("shelf_journal", importId);
  }
}

export const idbShelfStore = new IdbShelfStore();
