import { OracleSettingsService } from "@codex/oracle-engine";
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
    return this.settings?.modelName || "gemini-1.5-flash";
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

  async updateSettings(settings: any) {
    await this.service.updateSettings(settings);
  }

  async setKey(key: string) {
    if (this.apiKey === key) return;
    await this.service.updateSettings({ apiKey: key });
  }

  async clearKey() {
    await this.service.updateSettings({ apiKey: undefined });
  }
}
