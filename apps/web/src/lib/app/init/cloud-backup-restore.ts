import type { CloudBackupDeps } from "#lib/stores/cloud-backup-types.js";
import { vault } from "#lib/stores/vault.svelte.js";
import { mapRegistry } from "#lib/stores/map-registry.svelte.js";
import { canvasRegistry } from "#lib/stores/canvas-registry.svelte.js";
import { getDB } from "#lib/utils/idb.js";
import { writeOpfsFile } from "#lib/utils/opfs.js";

/** Writes restored records and raw media into the newly created vault. */
export function createCloudBackupRestore(): NonNullable<
  CloudBackupDeps["restore"]
> {
  return {
    createVault: (name: string) => vault.createVault(name),
    // `createVault` switches to the new vault before this runs, so these
    // writes land there rather than in whatever the user had open.
    importEntities: async (_vaultId: string, entities: unknown[]) => {
      await vault.batchCreateEntities(entities as never[]);
    },
    importMaps: async (_vaultId: string, maps: unknown[]) => {
      for (const map of maps as { id?: string }[]) {
        if (map?.id) mapRegistry.maps[map.id] = map as never;
      }
      await mapRegistry.saveMaps();
    },
    importCanvases: async (_vaultId: string, canvases: unknown[]) => {
      for (const canvas of canvases as { id?: string }[]) {
        if (!canvas?.id) continue;
        canvasRegistry.canvases[canvas.id] = canvas as never;
        await canvasRegistry.saveCanvas(canvas.id);
      }
    },
    /**
     * Writes restored session journals directly into IndexedDB rather than
     * through the store (spec 163-session-journal, FR-016) — a restore
     * happens once at import time, not through the store's own
     * start/append/end lifecycle, and `vaultId` on each record is
     * rewritten to the *new* vault this restore just created, never the
     * backup's original vault id.
     */
    importSessionJournals: async (vaultId: string, journals: unknown[]) => {
      const db = await getDB();
      for (const journal of journals as { id?: string }[]) {
        if (!journal?.id) continue;
        await db.put("session_journals", { ...journal, vaultId } as never);
      }
    },
    /**
     * Writes a restored file back at the exact path it came from.
     *
     * Not `saveImageToVault`: that renames to `images/<name>.webp` and
     * re-encodes to WebP, so entities and maps would point at paths that do
     * not exist, and a fog-of-war mask — binary data, not a picture — would
     * be destroyed by the conversion. A backup is a copy, so the bytes go
     * back byte-for-byte where they were.
     */
    importAsset: async (path: string, bytes: Uint8Array, mimeType: string) => {
      const root = await vault.getActiveVaultHandle();
      if (!root) throw new Error("No vault is open to restore into.");
      const segments = path.split("/").filter(Boolean);
      if (segments.length === 0) return;
      await writeOpfsFile(
        segments,
        new Blob([bytes as unknown as BlobPart], { type: mimeType }),
        root,
        vault.activeVaultId ?? undefined,
      );
    },
  };
}
