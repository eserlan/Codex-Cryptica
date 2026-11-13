import type { CloudBackupDeps } from "#lib/stores/cloud-backup-types.js";
import { vault } from "#lib/stores/vault.svelte.js";
import { mapRegistry } from "#lib/stores/map-registry.svelte.js";
import { canvasRegistry } from "#lib/stores/canvas-registry.svelte.js";
import { getDB } from "#lib/utils/idb.js";
import { writeOpfsFile } from "#lib/utils/opfs.js";
import { parseAdventureSessionForRecovery } from "@codex/adventure-engine";
import { isSafeRestoredAssetPath } from "#lib/services/cloud-backup-restore-path.js";

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
    importAdventures: async (vaultId: string, adventures: unknown[]) => {
      if (vault.activeVaultId !== vaultId)
        throw new Error("The destination Vault is no longer open.");
      const seen = new Set<string>();
      const documents = adventures.map((input) => {
        if (!input || typeof input !== "object" || Array.isArray(input))
          throw new Error("Invalid adventure in backup.");
        const raw = input as Record<string, unknown>;
        const id = raw.id;
        if (
          typeof id !== "string" ||
          !/^[a-zA-Z0-9_-]{1,160}$/.test(id) ||
          seen.has(id)
        )
          throw new Error("Invalid or duplicate adventure ID in backup.");
        const parsed = parseAdventureSessionForRecovery(raw);
        if (parsed.session.id !== id)
          throw new Error("Invalid adventure identity in backup.");
        seen.add(id);
        return { id, data: JSON.stringify({ ...raw, vaultId }) };
      });
      const root = await vault.getActiveVaultHandle();
      if (!root) throw new Error("No vault is open to restore into.");
      for (const document of documents) {
        if (vault.activeVaultId !== vaultId)
          throw new Error("The destination Vault is no longer open.");
        await writeOpfsFile(
          [".codex", "adventures", `${document.id}.json`],
          document.data,
          root,
          vaultId,
        );
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
      if (!isSafeRestoredAssetPath(segments.join("/")))
        throw new Error("Invalid asset path in backup.");
      await writeOpfsFile(
        segments,
        new Blob([bytes as unknown as BlobPart], { type: mimeType }),
        root,
        vault.activeVaultId ?? undefined,
      );
    },
  };
}
