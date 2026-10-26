import type {
  ConnectionDiscoveryMode,
  EntityDiscoveryMode,
  OracleAutomationPolicy,
} from "@codex/oracle-engine";
import type { ActivityEvent } from "$lib/types/activity";
import type { UIPersistence } from "./persistence";
import {
  UIPersistence as DefaultPersistence,
  UI_STORAGE_KEYS,
} from "./persistence";

function isEntityDiscoveryMode(
  value: string | null,
): value is EntityDiscoveryMode {
  return value === "off" || value === "suggest";
}

function isConnectionDiscoveryMode(
  value: string | null,
): value is ConnectionDiscoveryMode {
  return value === "off" || value === "suggest";
}

export class DiscoveryPolicyStore {
  private persistence: UIPersistence;

  aiDisabled = $state(false);
  autoArchive = $state(false);
  entityDiscoveryMode = $state<EntityDiscoveryMode>("suggest");
  connectionDiscoveryMode = $state<ConnectionDiscoveryMode>("suggest");
  archiveActivityLog = $state<ActivityEvent[]>([]);

  constructor(persistence: UIPersistence = new DefaultPersistence()) {
    this.persistence = persistence;
    this.loadFromPersistence();
  }

  private loadFromPersistence() {
    const aiDisabled = this.persistence.read(
      UI_STORAGE_KEYS.AI_DISABLED,
      (v) => v === "true",
      null,
    );
    if (aiDisabled !== null) {
      this.aiDisabled = aiDisabled;
    } else {
      const lite = this.persistence.read(
        UI_STORAGE_KEYS.LITE_MODE,
        (v) => v === "true",
        null,
      );
      if (lite !== null) {
        this.aiDisabled = lite;
        this.persistence.write(UI_STORAGE_KEYS.AI_DISABLED, lite, String);
        this.persistence.remove(UI_STORAGE_KEYS.LITE_MODE);
      }
    }

    const savedEntityMode = this.persistence.read(
      UI_STORAGE_KEYS.ENTITY_DISCOVERY_MODE,
      (v) => v,
      null,
    );
    if (isEntityDiscoveryMode(savedEntityMode)) {
      this.entityDiscoveryMode = savedEntityMode;
      this.autoArchive = false;
    } else {
      const autoArchive = this.persistence.read(
        UI_STORAGE_KEYS.AUTO_ARCHIVE,
        (v) => v === "true",
        null,
      );
      if (savedEntityMode === "auto-create" || autoArchive === true) {
        this.entityDiscoveryMode = "suggest";
        this.persistence.write(
          UI_STORAGE_KEYS.ENTITY_DISCOVERY_MODE,
          this.entityDiscoveryMode,
          String,
        );
      }
      this.autoArchive = false;
      this.persistence.write(UI_STORAGE_KEYS.AUTO_ARCHIVE, false, String);
    }

    const savedConnectionMode = this.persistence.read(
      UI_STORAGE_KEYS.CONNECTION_DISCOVERY_MODE,
      (v) => v,
      null,
    );
    if (isConnectionDiscoveryMode(savedConnectionMode)) {
      this.connectionDiscoveryMode = savedConnectionMode;
    } else if (savedConnectionMode === "auto-apply") {
      this.connectionDiscoveryMode = "suggest";
      this.persistence.write(
        UI_STORAGE_KEYS.CONNECTION_DISCOVERY_MODE,
        this.connectionDiscoveryMode,
        String,
      );
    }
  }

  get oracleAutomationPolicy(): OracleAutomationPolicy {
    return {
      entityDiscovery: this.entityDiscoveryMode,
      connectionDiscovery: this.connectionDiscoveryMode,
    };
  }

  toggleAiDisabled(enabled: boolean) {
    this.aiDisabled = enabled;
    this.persistence.write(UI_STORAGE_KEYS.AI_DISABLED, enabled, String);
  }

  toggleAutoArchive(enabled: boolean) {
    this.setEntityDiscoveryMode(enabled ? "suggest" : "off");
  }

  setEntityDiscoveryMode(mode: EntityDiscoveryMode) {
    this.entityDiscoveryMode = mode === "auto-create" ? "suggest" : mode;
    this.autoArchive = false;
    this.persistence.write(
      UI_STORAGE_KEYS.ENTITY_DISCOVERY_MODE,
      this.entityDiscoveryMode,
      String,
    );
    this.persistence.write(UI_STORAGE_KEYS.AUTO_ARCHIVE, false, String);
  }

  setConnectionDiscoveryMode(mode: ConnectionDiscoveryMode) {
    this.connectionDiscoveryMode = mode === "auto-apply" ? "suggest" : mode;
    this.persistence.write(
      UI_STORAGE_KEYS.CONNECTION_DISCOVERY_MODE,
      this.connectionDiscoveryMode,
      String,
    );
  }
}

const KEY = "__codex_discovery_policy_store__";
export const discoveryPolicyStore: DiscoveryPolicyStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new DiscoveryPolicyStore());
