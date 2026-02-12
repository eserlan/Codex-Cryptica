// apps/web/src/lib/stores/vault-registry.svelte.ts
import { getDB, type VaultRecord } from "../utils/idb";
import { getOpfsRoot, createVaultDir, deleteVaultDir } from "../utils/opfs";
import { sanitizeId } from "../utils/markdown";
import { debugStore } from "./debug.svelte";

class VaultRegistryStore {
  availableVaults = $state<VaultRecord[]>([]);
  activeVaultId = $state<string | null>(null);
  vaultName = $state<string>("Local Vault");
  isInitialized = $state(false);
  isLoading = $state(false);

  #opfsRoot: FileSystemDirectoryHandle | undefined = undefined;

  get rootHandle() {
    return this.#opfsRoot;
  }

  async init() {
    if (this.isInitialized) return;
    this.isLoading = true;

    try {
      this.#opfsRoot = await getOpfsRoot();
      const db = await getDB();

      this.activeVaultId = (await db.get("settings", "activeVaultId")) || null;

      if (!this.activeVaultId && this.#opfsRoot) {
        // Initialize default vault if none active
        this.activeVaultId = "default";
        await db.put("settings", "default", "activeVaultId");
        await createVaultDir(this.#opfsRoot, "default");

        const existing = await db.get("vaults", "default");
        if (!existing) {
          await db.put("vaults", {
            id: "default",
            name: "Default Vault",
            createdAt: Date.now(),
            lastOpenedAt: Date.now(),
            entityCount: 0,
          });
        }
      }

      const vaultRecord = this.activeVaultId
        ? await db.get("vaults", this.activeVaultId)
        : null;
      this.vaultName = vaultRecord?.name || "Local Vault";

      await this.listVaults();
      this.isInitialized = true;
    } catch (err) {
      console.error("[VaultRegistry] Init failed", err);
      debugStore.error("Vault Registry initialization failed", err);
    } finally {
      this.isLoading = false;
    }
  }

  async listVaults(): Promise<VaultRecord[]> {
    const db = await getDB();
    const vaults = await db.getAll("vaults");
    this.availableVaults = vaults.sort(
      (a, b) => b.lastOpenedAt - a.lastOpenedAt,
    );
    return this.availableVaults;
  }

  async createVault(name: string): Promise<string> {
    if (!this.#opfsRoot) throw new Error("Storage not initialized");

    const slug = sanitizeId(name) || "vault";
    const id = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const db = await getDB();
    await createVaultDir(this.#opfsRoot, id);

    const record: VaultRecord = {
      id,
      name,
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
      entityCount: 0,
    };
    await db.put("vaults", record);

    await this.listVaults();
    return id;
  }

  async renameVault(id: string, newName: string): Promise<void> {
    const db = await getDB();
    const vault = await db.get("vaults", id);
    if (vault) {
      vault.name = newName;
      await db.put("vaults", vault);
      if (this.activeVaultId === id) {
        this.vaultName = newName;
      }
      await this.listVaults();
    }
  }

  async deleteVault(id: string): Promise<void> {
    if (id === this.activeVaultId)
      throw new Error("Cannot delete active vault");
    if (!this.#opfsRoot) return;

    try {
      await deleteVaultDir(this.#opfsRoot, id);
      const db = await getDB();
      await db.delete("vaults", id);
      await this.listVaults();
    } catch (e) {
      console.warn("[VaultRegistry] Failed to delete vault dir", e);
      throw new Error("Filesystem lock prevented deletion. Please try again.");
    }
  }

  async setActiveVault(id: string): Promise<void> {
    const db = await getDB();
    const vaultRecord = await db.get("vaults", id);
    if (!vaultRecord) throw new Error(`Vault ${id} not found`);

    this.activeVaultId = id;
    this.vaultName = vaultRecord.name;

    await db.put("settings", id, "activeVaultId");

    vaultRecord.lastOpenedAt = Date.now();
    await db.put("vaults", vaultRecord);

    await this.listVaults();
  }
}

const REGISTRY_KEY = "__codex_vault_registry_instance__";
export const vaultRegistry: VaultRegistryStore =
  (globalThis as any)[REGISTRY_KEY] ??
  ((globalThis as any)[REGISTRY_KEY] = new VaultRegistryStore());
