import {
  getOpfsRoot,
  getVaultDir,
  readFileAsText,
  writeOpfsFile,
} from "./opfs";

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
}

export type VaultConfigUpdater = (
  vaultId: string,
  update: (config: Record<string, unknown>) => void,
) => Promise<void>;

export function createVaultConfigUpdater(
  dependencies: VaultConfigDependencies,
): VaultConfigUpdater {
  const pendingWrites = new Map<string, Promise<void>>();

  return async (vaultId, update) => {
    const previous = pendingWrites.get(vaultId) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(async () => {
        const root = await dependencies.getOpfsRoot();
        const vaultDir = await dependencies.getVaultDir(root, vaultId);
        let config: Record<string, unknown> = {};
        try {
          config = JSON.parse(
            await dependencies.readFileAsText(vaultDir, CONFIG_PATH),
          );
        } catch {
          // A missing or unreadable config starts from an empty object.
        }

        update(config);
        await dependencies.writeOpfsFile(
          CONFIG_PATH,
          JSON.stringify(config, null, 2),
          vaultDir,
          vaultId,
        );
      });
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
