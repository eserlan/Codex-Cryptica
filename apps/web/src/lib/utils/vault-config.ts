import {
  getOpfsRoot,
  getVaultDir,
  readFileAsText,
  writeOpfsFile,
} from "./opfs";
import { entityDb } from "./entity-db";

const CONFIG_PATH = [".codex", "config.json"];

export interface VaultConfigDependencies {
  getOpfsRoot(): Promise<FileSystemDirectoryHandle>;
  getVaultDir(
    root: FileSystemDirectoryHandle,
    vaultId: string,
  ): Promise<FileSystemDirectoryHandle>;
  readFileAsText(
    root: FileSystemDirectoryHandle,
    path: string[],
  ): Promise<string>;
  writeOpfsFile(
    path: string[],
    content: string,
    root: FileSystemDirectoryHandle,
    vaultId: string,
  ): Promise<void>;
  withLock?: VaultConfigLock;
}

export type VaultConfigUpdater = (
  vaultId: string,
  update: (config: Record<string, unknown>) => void | Promise<void>,
) => Promise<void>;

/**
 * `ensureHeld` is supplied by locks that can lose ownership mid-operation
 * (the IndexedDB lease). Call it before a write; it rejects if the lock was lost.
 */
export type VaultConfigLock = <T>(
  name: string,
  operation: (ensureHeld?: () => Promise<void>) => Promise<T>,
) => Promise<T>;

const FALLBACK_LOCK_LEASE_MS = 15_000;
const FALLBACK_LOCK_RENEW_MS = 5_000;
const FALLBACK_LOCK_RETRY_MS = 25;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function createLockToken(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

async function withIndexedDbLock<T>(
  name: string,
  operation: (ensureHeld?: () => Promise<void>) => Promise<T>,
): Promise<T> {
  const key = `vault-config-lock:${name}`;
  const owner = createLockToken();
  let acquired = false;

  while (!acquired) {
    acquired = await entityDb.transaction(
      "rw",
      entityDb.appSettings,
      async () => {
        const current = await entityDb.appSettings.get(key);
        const now = Date.now();
        if (current && current.value.expiresAt > now) return false;

        await entityDb.appSettings.put({
          key,
          value: { owner, expiresAt: now + FALLBACK_LOCK_LEASE_MS },
          updatedAt: now,
        });
        return true;
      },
    );
    if (!acquired) await wait(FALLBACK_LOCK_RETRY_MS);
  }

  const renew = setInterval(() => {
    void entityDb
      .transaction("rw", entityDb.appSettings, async () => {
        const current = await entityDb.appSettings.get(key);
        if (current?.value.owner !== owner) return;
        const now = Date.now();
        await entityDb.appSettings.put({
          key,
          value: { owner, expiresAt: now + FALLBACK_LOCK_LEASE_MS },
          updatedAt: now,
        });
      })
      .catch(() => undefined);
  }, FALLBACK_LOCK_RENEW_MS);

  const ensureHeld = async () => {
    const stillHeld = await entityDb.appSettings.get(key);
    if (
      stillHeld?.value.owner !== owner ||
      stillHeld.value.expiresAt <= Date.now()
    ) {
      throw new Error("Vault config lock was lost before the write completed");
    }
  };

  try {
    return await operation(ensureHeld);
  } finally {
    clearInterval(renew);
    await entityDb.transaction("rw", entityDb.appSettings, async () => {
      const current = await entityDb.appSettings.get(key);
      if (current?.value.owner === owner) {
        await entityDb.appSettings.delete(key);
      }
    });
  }
}

const withBrowserLock: VaultConfigLock = async (name, operation) => {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(name, () => operation());
  }
  return withIndexedDbLock(name, operation);
};

export function createVaultConfigUpdater(
  dependencies: VaultConfigDependencies,
): VaultConfigUpdater {
  const pendingWrites = new Map<string, Promise<void>>();
  const withLock = dependencies.withLock ?? withBrowserLock;

  return async (vaultId, update) => {
    const previous = pendingWrites.get(vaultId) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(() =>
        withLock(`codex-vault-config:${vaultId}`, async (ensureHeld) => {
          const root = await dependencies.getOpfsRoot();
          const vaultDir = await dependencies.getVaultDir(root, vaultId);
          let config: Record<string, unknown> = {};
          try {
            config = JSON.parse(
              await dependencies.readFileAsText(vaultDir, CONFIG_PATH),
            );
          } catch (err) {
            // Only a missing file starts empty. Never overwrite a config we
            // failed to read or parse, or unrelated keys would be lost.
            if ((err as Error)?.name !== "NotFoundError") throw err;
          }

          await update(config);
          await ensureHeld?.();
          await dependencies.writeOpfsFile(
            CONFIG_PATH,
            JSON.stringify(config, null, 2),
            vaultDir,
            vaultId,
          );
        }),
      );
    pendingWrites.set(vaultId, current);

    try {
      await current;
    } finally {
      if (pendingWrites.get(vaultId) === current) {
        pendingWrites.delete(vaultId);
      }
    }
  };
}

export const updateVaultConfig = createVaultConfigUpdater({
  getOpfsRoot,
  getVaultDir,
  readFileAsText,
  writeOpfsFile,
});
