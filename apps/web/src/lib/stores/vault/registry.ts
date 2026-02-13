import { getDB, type VaultRecord } from "../../utils/idb";
import { createVaultDir, deleteVaultDir, getVaultDir } from "../../utils/opfs";
import { sanitizeId } from "../../utils/markdown";

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
    throw new Error("Filesystem lock prevented deletion. Please try again.");
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
