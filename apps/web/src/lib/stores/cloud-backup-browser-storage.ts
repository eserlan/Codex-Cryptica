import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";

/**
 * Per-vault persistence in `localStorage`.
 *
 * Deliberately simple: one small record per vault, read once on load. It has to
 * survive reloads (FR-020) and it holds the ownership code, so it must not live
 * only in memory. Failures are swallowed — a browser with storage blocked
 * should degrade to "cloud backup unavailable", never to a thrown error on the
 * save path.
 */
export function cloudBackupBrowserStorage(
  storage: StorageLike = browserStorage,
) {
  const key = (vaultId: string) => `codex.cloud-backup.${vaultId}`;
  return {
    async read(vaultId: string) {
      try {
        const raw = storage.getItem(key(vaultId));
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    async write(vaultId: string, record: unknown) {
      try {
        storage.setItem(key(vaultId), JSON.stringify(record));
      } catch {
        // Storage unavailable; the in-memory state still drives this session.
      }
    },
    async clear(vaultId: string) {
      try {
        storage.removeItem(key(vaultId));
      } catch {
        // Nothing to do.
      }
    },
    async list() {
      const prefix = key("");
      try {
        const entries: { vaultId: string; record: unknown }[] = [];
        for (let i = 0; i < (storage.length ?? 0); i += 1) {
          const storageKey = storage.key?.(i);
          if (!storageKey?.startsWith(prefix)) continue;
          const raw = storage.getItem(storageKey);
          if (!raw) continue;
          try {
            entries.push({
              vaultId: storageKey.slice(prefix.length),
              record: JSON.parse(raw),
            });
          } catch {
            // One corrupt entry must not hide the rest.
          }
        }
        return entries;
      } catch {
        return [];
      }
    },
  };
}
