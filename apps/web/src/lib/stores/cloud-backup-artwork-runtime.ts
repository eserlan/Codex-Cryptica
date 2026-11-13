import {
  CloudBackupArtworkConsent,
  type ArtworkBackupConsent,
} from "./cloud-backup-artwork-consent";

interface Dependencies {
  read(key: string): Promise<unknown>;
  write(key: string, value: ArtworkBackupConsent): Promise<void>;
  locks: Pick<LockManager, "request"> | undefined;
  requireFullPush(vaultId: string): Promise<void>;
  newRemovalId(): string;
}

/** Assemble persisted consent and upload exclusion over the same per-Vault lock. */
export function createArtworkBackupRuntime(deps: Dependencies) {
  const key = (vaultId: string) => `cloud-backup-adventure-consent:${vaultId}`;
  async function lock<T>(name: string, action: () => Promise<T>): Promise<T> {
    if (!deps.locks) throw new Error("Adventure backup lock unavailable");
    return deps.locks.request(name, { mode: "exclusive" }, action);
  }
  const consent = new CloudBackupArtworkConsent({
    read: (vaultId) => deps.read(key(vaultId)),
    write: (vaultId, value) => deps.write(key(vaultId), value),
    requireFullPush: deps.requireFullPush,
    newRemovalId: deps.newRemovalId,
    lock,
  });
  return {
    consent,
    scope: {
      lock: async <T>(name: string, action: () => Promise<T>): Promise<T> => {
        if (deps.locks) return lock(name, action);
        // Without Web Locks this runtime cannot change consent. Ordinary
        // backups can still run when no expanded scope has ever been enabled.
        const prefix = "cloud-backup-artwork:";
        if (!name.startsWith(prefix)) throw new Error("Invalid backup lock");
        const state = await consent.read(name.slice(prefix.length));
        if (state.enabled || state.remoteRemovalPending)
          throw new Error("Adventure backup lock unavailable");
        return action();
      },
      readConsent: (vaultId: string) => consent.read(vaultId),
      confirmRemoval: (vaultId: string, id: string) =>
        consent.confirmRemoval(vaultId, id),
    },
  };
}
