import type { OracleSettingsService } from "@codex/oracle-engine";
import type { IOracleStore } from "./types";

export class OracleSettingsManager {
  constructor(private store: IOracleStore) {}

  private get service(): OracleSettingsService {
    return this.store.settingsService;
  }

  async init(db: any) {
    await this.service.init(db);
  }

  get settings() {
    return this.service.settings;
  }

  get apiKey(): string | undefined {
    return this.settings?.apiKey ?? undefined;
  }

  get modelName() {
    return this.settings?.modelName || "gemini-3.1-flash-lite";
  }

  get isLoading() {
    return this.service.isLoading;
  }

  get activeStyleTitle() {
    return this.service.activeStyleTitle;
  }

  get connectionMode() {
    return this.settings?.connectionMode || "system-proxy";
  }

  get tier(): "lite" | "advanced" {
    return this.service.tier;
  }

  async updateSettings(settings: any) {
    await this.service.updateSettings(settings);
  }

  async setKey(key: string) {
    if (this.apiKey === key) return;
    await this.service.updateSettings({ apiKey: key });
  }

  async setTier(tier: "lite" | "advanced") {
    await this.service.setTier(tier);
  }

  async clearKey() {
    await this.service.clearKey();
  }
}
