import { getDB, type VaultRecord } from "../../utils/idb";
import { createVaultDir, deleteVaultDir, getVaultDir } from "../../utils/opfs";
import { sanitizeId } from "../../utils/markdown";
import { debounce } from "../../utils/debounce";
import type { PublishRegistry } from "schema";

export { getVaultDir, createVaultDir };

export async function listVaults(): Promise<VaultRecord[]> {
  const db = await getDB();
  const vaults = await db.getAll("vaults");
  return vaults.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
}

export async function createVault(
  opfsRoot: FileSystemDirectoryHandle,
  name: string,
): Promise<VaultRecord> {
  if (!opfsRoot) throw new Error("Storage not initialized");

  // Generate simple unique ID
  const slug = sanitizeId(name) || "vault";
  const id = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const db = await getDB();

  // Create Directory
  await createVaultDir(opfsRoot, id);

  // Register
  const record: VaultRecord = {
    id,
    name,
    createdAt: Date.now(),
    lastOpenedAt: Date.now(),
    entityCount: 0,
    lastInternalChange: Date.now(),
    lastSavedToFolder: 0,
    syncState: {
      lastSyncMs: null,
      remoteHash: null,
      status: "idle",
    },
  };
  await db.put("vaults", record);

  return record;
}

export async function renameVault(
  id: string,
  newName: string,
): Promise<VaultRecord | null> {
  const db = await getDB();
  const vault = await db.get("vaults", id);
  if (vault) {
    vault.name = newName;
    await db.put("vaults", vault);
    return vault;
  }
  return null;
}

export async function deleteVault(
  opfsRoot: FileSystemDirectoryHandle,
  id: string,
): Promise<void> {
  if (!opfsRoot) return;

  try {
    await deleteVaultDir(opfsRoot, id);
    const db = await getDB();

    await db.delete("vaults", id);
  } catch (e) {
    console.warn("Failed to delete vault dir", e);
    throw new Error("Filesystem lock prevented deletion. Please try again.", {
      cause: e,
    });
  }
}
export async function getVault(id: string): Promise<VaultRecord | undefined> {
  const db = await getDB();
  return await db.get("vaults", id);
}

export async function updateLastOpened(id: string): Promise<void> {
  const db = await getDB();
  const vault = await db.get("vaults", id);
  if (vault) {
    vault.lastOpenedAt = Date.now();
    await db.put("vaults", vault);
  }
}

const triggerRefresh = debounce(async () => {
  const { vaultRegistry } = await import("../vault-registry.svelte");
  if (vaultRegistry) {
    await vaultRegistry.refreshVaults();
  }
}, 100);

export async function updateLastInternalChange(id: string): Promise<void> {
  const db = await getDB();
  const vault = await db.get("vaults", id);
  if (vault) {
    vault.lastInternalChange = Date.now();
    await db.put("vaults", vault);

    // Trigger debounced refresh
    triggerRefresh();
  }
}

export async function updateLastSavedToFolder(id: string): Promise<void> {
  const db = await getDB();
  const vault = await db.get("vaults", id);
  if (vault) {
    vault.lastSavedToFolder = Date.now();
    await db.put("vaults", vault);

    // Trigger debounced refresh
    triggerRefresh();
  }
}

export async function getPublishRegistry(
  vaultId: string,
): Promise<PublishRegistry | undefined> {
  const db = await getDB();
  return await db.get("publish_registry", vaultId);
}

export async function savePublishRegistry(
  registry: PublishRegistry,
): Promise<void> {
  const db = await getDB();
  await db.put("publish_registry", registry);
}

export async function deletePublishRegistry(vaultId: string): Promise<void> {
  const db = await getDB();
  await db.delete("publish_registry", vaultId);
}

export async function listPublishRegistries(): Promise<PublishRegistry[]> {
  const db = await getDB();
  return await db.getAll("publish_registry");
}
