import {
  createMemoryStorage,
  type CloudBackupRuntime,
} from "@codex/cloud-backup-sync";

/** A runtime with no persistence, for contexts that never enable backup. */
export function createInertRuntime(baseUrl = ""): CloudBackupRuntime {
  return {
    baseUrl,
    storage: createMemoryStorage(),
    fetch: (async () => {
      throw new Error("Cloud backup is not configured.");
    }) as CloudBackupRuntime["fetch"],
  };
}
