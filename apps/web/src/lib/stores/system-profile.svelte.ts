import {
  gameSystemRegistry,
  GameSystemRegistry,
  type GameSystemProfile,
  SYSTEM_NEUTRAL_ID,
  TOV_SYSTEM_ID,
} from "schema";
import { getDB } from "../utils/idb";
import { getOpfsRoot, getVaultDir, readFileAsText } from "../utils/opfs";
import { updateVaultConfig } from "../utils/vault-config";

export interface SystemProfileStorageDependencies {
  getDB: typeof getDB;
  getOpfsRoot: typeof getOpfsRoot;
  getVaultDir: typeof getVaultDir;
  readFileAsText: typeof readFileAsText;
  updateVaultConfig: typeof updateVaultConfig;
}

export interface ISystemProfileStorage {
  loadFromCache(vaultId: string): Promise<string | null>;
  saveToCache(vaultId: string, systemId: string | null): Promise<void>;
  loadFromDisk(vaultId: string): Promise<string | null>;
  saveToDisk(vaultId: string, systemId: string | null): Promise<void>;
}

export function createSystemProfileStorage(
  dependencies: SystemProfileStorageDependencies = {
    getDB,
    getOpfsRoot,
    getVaultDir,
    readFileAsText,
    updateVaultConfig,
  },
): ISystemProfileStorage {
  return {
    async loadFromCache(vaultId: string): Promise<string | null> {
      try {
        const db = await dependencies.getDB();
        const value = await db.get("settings", `system_profile_${vaultId}`);
        return value ?? null;
      } catch {
        return null;
      }
    },
    async saveToCache(vaultId: string, systemId: string | null): Promise<void> {
      try {
        const db = await dependencies.getDB();
        if (
          systemId &&
          systemId.trim() !== "" &&
          systemId !== SYSTEM_NEUTRAL_ID
        ) {
          await db.put("settings", systemId, `system_profile_${vaultId}`);
        } else {
          await db.delete("settings", `system_profile_${vaultId}`);
        }
      } catch (err) {
        console.warn("[SystemProfileStore] Failed to save to cache", err);
      }
    },
    async loadFromDisk(vaultId: string): Promise<string | null> {
      try {
        const root = await dependencies.getOpfsRoot();
        const vaultDir = await dependencies.getVaultDir(root, vaultId);
        const json = await dependencies.readFileAsText(vaultDir, [
          ".codex",
          "config.json",
        ]);
        const config = JSON.parse(json);
        return config.systemId ?? config.system ?? null;
      } catch {
        return null;
      }
    },
    async saveToDisk(vaultId: string, systemId: string | null): Promise<void> {
      try {
        await dependencies.updateVaultConfig(vaultId, (config) => {
          if (
            systemId &&
            systemId.trim() !== "" &&
            systemId !== SYSTEM_NEUTRAL_ID
          ) {
            config.systemId = systemId;
          } else {
            delete config.systemId;
            delete config.system;
          }
        });
      } catch (err) {
        console.warn("[SystemProfileStore] Failed to save to disk", err);
      }
    },
  };
}

export const defaultSystemProfileStorage = createSystemProfileStorage();

export class SystemProfileStore {
  activeVaultId = $state<string | null>(null);
  vaultSystemId = $state<string | null>(null);
  isInitialized = $state<boolean>(false);
  isLoading = $state<boolean>(false);

  private registry: GameSystemRegistry;
  private storage: ISystemProfileStorage;
  private initGeneration = 0;
  private cacheUpdates = new Map<string, Promise<void>>();

  activeProfile = $derived.by(() => {
    return this.registry.get(this.vaultSystemId);
  });

  isTalesOfTheValiant = $derived.by(() => {
    return this.activeProfile.id === TOV_SYSTEM_ID;
  });

  isNeutral = $derived.by(() => {
    return (
      this.activeProfile.id === SYSTEM_NEUTRAL_ID ||
      this.activeProfile.isDefault
    );
  });

  hasLuck = $derived.by(() => {
    return Boolean(this.activeProfile.capabilities.hasLuck);
  });

  hasDoom = $derived.by(() => {
    return Boolean(this.activeProfile.capabilities.hasDoom);
  });

  constructor(
    registry: GameSystemRegistry = gameSystemRegistry,
    storage: ISystemProfileStorage = defaultSystemProfileStorage,
  ) {
    this.registry = registry;
    this.storage = storage;
  }

  async init(vaultId?: string | null): Promise<void> {
    const generation = ++this.initGeneration;
    this.activeVaultId = vaultId ?? null;
    if (!this.activeVaultId) {
      this.vaultSystemId = null;
      this.isInitialized = true;
      this.isLoading = false;
      return;
    }

    const selectedVaultId = this.activeVaultId;
    this.isLoading = true;
    this.isInitialized = false;
    try {
      // 1. Try cache first for fast paint
      let systemId = await this.storage.loadFromCache(selectedVaultId);

      // 2. If not in cache, fallback to reading disk
      if (!systemId) {
        systemId = await this.updateCacheForVault(selectedVaultId, async () => {
          const loadedSystemId =
            await this.storage.loadFromDisk(selectedVaultId);
          if (loadedSystemId && generation === this.initGeneration) {
            await this.storage.saveToCache(selectedVaultId, loadedSystemId);
          }
          return loadedSystemId;
        });
      }

      if (generation !== this.initGeneration) return;
      this.vaultSystemId = systemId;
      this.isInitialized = true;
    } catch (err) {
      console.warn(
        "[SystemProfileStore] Init error, falling back to neutral",
        err,
      );
      if (generation === this.initGeneration) {
        this.vaultSystemId = null;
        this.isInitialized = true;
      }
    } finally {
      if (generation === this.initGeneration) this.isLoading = false;
    }
  }

  async setVaultSystemId(systemId: string | null): Promise<void> {
    this.initGeneration += 1;
    this.isLoading = false;
    this.isInitialized = true;
    const normalized =
      systemId && systemId.trim() !== "" ? systemId.trim() : null;
    this.vaultSystemId = normalized;

    const selectedVaultId = this.activeVaultId;
    if (selectedVaultId) {
      await Promise.all([
        this.updateCacheForVault(selectedVaultId, () =>
          this.storage.saveToCache(selectedVaultId, normalized),
        ),
        this.storage.saveToDisk(selectedVaultId, normalized),
      ]);
    }
  }

  private async updateCacheForVault<T>(
    vaultId: string,
    update: () => Promise<T>,
  ): Promise<T> {
    const previous = this.cacheUpdates.get(vaultId) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(update);
    const tail = current.then(
      () => undefined,
      () => undefined,
    );
    this.cacheUpdates.set(vaultId, tail);

    try {
      return await current;
    } finally {
      if (this.cacheUpdates.get(vaultId) === tail) {
        this.cacheUpdates.delete(vaultId);
      }
    }
  }

  resolveEntitySystem(entity?: {
    systemId?: string | null;
  }): GameSystemProfile {
    return this.registry.resolve({
      entitySystemId: entity?.systemId,
      vaultSystemId: this.vaultSystemId,
    });
  }

  listAvailableProfiles(): GameSystemProfile[] {
    return this.registry.list();
  }
}

export const systemProfileStore = new SystemProfileStore();
