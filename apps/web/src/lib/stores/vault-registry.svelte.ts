// apps/web/src/lib/stores/vault-registry.svelte.ts
import { getDB, type VaultRecord } from "../utils/idb";
import { getOpfsRoot, createVaultDir } from "../utils/opfs";
import { debugStore } from "./debug.svelte";
import * as registry from "./vault/registry";

class VaultRegistryStore {
  availableVaults = $state<VaultRecord[]>([]);
  activeVaultId = $state<string | null>(null);
  vaultName = $state<string>("Local Vault");
  isInitialized = $state(false);
  isLoading = $state(false);

  #opfsRoot: FileSystemDirectoryHandle | undefined = undefined;

  get rootHandle() {
    if (!this.isInitialized) {
      console.warn("[VaultRegistry] rootHandle accessed before initialization");
    }
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

        const existing = await registry.getVault("default");
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
        ? await registry.getVault(this.activeVaultId)
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
    this.availableVaults = await registry.listVaults();
    return this.availableVaults;
  }

  async createVault(name: string): Promise<string> {
    if (!this.#opfsRoot) throw new Error("Storage not initialized");
    const record = await registry.createVault(this.#opfsRoot, name);
    await this.listVaults();
    return record.id;
  }

  async renameVault(id: string, newName: string): Promise<void> {
    const record = await registry.renameVault(id, newName);
    if (record && this.activeVaultId === id) {
      this.vaultName = newName;
    }
    await this.listVaults();
  }

  async deleteVault(id: string): Promise<void> {
    if (id === this.activeVaultId)
      throw new Error("Cannot delete active vault");
    if (!this.#opfsRoot) return;

    await registry.deleteVault(this.#opfsRoot, id);
    await this.listVaults();
  }

  async setActiveVault(id: string): Promise<void> {
    const vaultRecord = await registry.getVault(id);
    if (!vaultRecord) throw new Error(`Vault ${id} not found`);

    this.activeVaultId = id;
    this.vaultName = vaultRecord.name;

    const db = await getDB();
    await db.put("settings", id, "activeVaultId");

    await registry.updateLastOpened(id);
    await this.listVaults();
  }
}

const REGISTRY_KEY = "__codex_vault_registry_instance__";
export const vaultRegistry: VaultRegistryStore =
  (globalThis as any)[REGISTRY_KEY] ??
  ((globalThis as any)[REGISTRY_KEY] = new VaultRegistryStore());
