import {
  gameSystemRegistry,
  GameSystemRegistry,
  type GameSystemProfile,
  SYSTEM_NEUTRAL_ID,
  TOV_SYSTEM_ID,
} from "schema";
import { getDB } from "../utils/idb";
import {
  getOpfsRoot,
  getVaultDir,
  readFileAsText,
  writeOpfsFile,
} from "../utils/opfs";

const CONFIG_PATH = [".codex", "config.json"];

export interface ISystemProfileStorage {
  loadFromCache(vaultId: string): Promise<string | null>;
  saveToCache(vaultId: string, systemId: string | null): Promise<void>;
  loadFromDisk(vaultId: string): Promise<string | null>;
  saveToDisk(vaultId: string, systemId: string | null): Promise<void>;
}

export const defaultSystemProfileStorage: ISystemProfileStorage = {
  async loadFromCache(vaultId: string): Promise<string | null> {
    try {
      const db = await getDB();
      const value = await db.get("settings", `system_profile_${vaultId}`);
      return value ?? null;
    } catch {
      return null;
    }
  },
  async saveToCache(vaultId: string, systemId: string | null): Promise<void> {
    try {
      const db = await getDB();
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
      const root = await getOpfsRoot();
      const vaultDir = await getVaultDir(root, vaultId);
      const json = await readFileAsText(vaultDir, CONFIG_PATH);
      const config = JSON.parse(json);
      return config.systemId ?? config.system ?? null;
    } catch {
      return null;
    }
  },
  async saveToDisk(vaultId: string, systemId: string | null): Promise<void> {
    // fallow-ignore-next-line code-duplication
    try {
      const root = await getOpfsRoot();
      const vaultDir = await getVaultDir(root, vaultId);
      let config: Record<string, unknown> = {};
      try {
        const json = await readFileAsText(vaultDir, CONFIG_PATH);
        config = JSON.parse(json);
      } catch {
        // Fresh config if not existing
      }

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

      await writeOpfsFile(
        CONFIG_PATH,
        JSON.stringify(config, null, 2),
        vaultDir,
        vaultId,
      );
    } catch (err) {
      console.warn("[SystemProfileStore] Failed to save to disk", err);
    }
  },
};

export class SystemProfileStore {
  activeVaultId = $state<string | null>(null);
  vaultSystemId = $state<string | null>(null);
  isInitialized = $state<boolean>(false);
  isLoading = $state<boolean>(false);

  private registry: GameSystemRegistry;
  private storage: ISystemProfileStorage;

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
    this.activeVaultId = vaultId ?? null;
    if (!this.activeVaultId) {
      this.vaultSystemId = null;
      this.isInitialized = true;
      return;
    }

    this.isLoading = true;
    try {
      // 1. Try cache first for fast paint
      let systemId = await this.storage.loadFromCache(this.activeVaultId);

      // 2. If not in cache, fallback to reading disk
      if (!systemId) {
        systemId = await this.storage.loadFromDisk(this.activeVaultId);
        if (systemId) {
          await this.storage.saveToCache(this.activeVaultId, systemId);
        }
      }

      this.vaultSystemId = systemId;
      this.isInitialized = true;
    } catch (err) {
      console.warn(
        "[SystemProfileStore] Init error, falling back to neutral",
        err,
      );
      this.vaultSystemId = null;
      this.isInitialized = true;
    } finally {
      this.isLoading = false;
    }
  }

  async setVaultSystemId(systemId: string | null): Promise<void> {
    const normalized =
      systemId && systemId.trim() !== "" ? systemId.trim() : null;
    this.vaultSystemId = normalized;

    if (this.activeVaultId) {
      await Promise.all([
        this.storage.saveToCache(this.activeVaultId, normalized),
        this.storage.saveToDisk(this.activeVaultId, normalized),
      ]);
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
