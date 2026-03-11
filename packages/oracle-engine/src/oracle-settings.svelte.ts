import type { IDBPDatabase } from "idb";

export class OracleSettingsService {
  apiKey = $state<string | null>(null);
  tier = $state<"lite" | "advanced">("lite");
  isLoading = $state(false);
  activeStyleTitle = $state<string | null>(null);

  private channel: BroadcastChannel | null = null;
  private db: IDBPDatabase<any> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.channel = new BroadcastChannel("codex-oracle-sync");
      this.channel.onmessage = (event) => {
        const { type, data } = event.data;
        if (type === "SYNC_STATE") {
          this.isLoading = data.isLoading;
          this.apiKey = data.apiKey;
          this.tier = data.tier || "lite";
          this.activeStyleTitle = data.activeStyleTitle || null;
        } else if (type === "REQUEST_STATE") {
          this.broadcast();
        }
      };
      this.channel.postMessage({ type: "REQUEST_STATE" });
    }
  }

  async init(db: IDBPDatabase<any>) {
    this.db = db;
    this.apiKey = (await db.get("settings", "ai_api_key")) || null;
    this.tier = (await db.get("settings", "ai_tier")) || "lite";
    this.broadcast();
  }

  broadcast() {
    this.channel?.postMessage({
      type: "SYNC_STATE",
      data: {
        isLoading: this.isLoading,
        apiKey: this.apiKey,
        tier: this.tier,
        activeStyleTitle: this.activeStyleTitle,
      },
    });
  }

  async setTier(tier: "lite" | "advanced") {
    if (this.db) await this.db.put("settings", tier, "ai_tier");
    this.tier = tier;
    this.broadcast();
  }

  async setKey(key: string) {
    if (this.db) await this.db.put("settings", key, "ai_api_key");
    this.apiKey = key;
    this.broadcast();
  }

  async clearKey() {
    if (this.db) await this.db.delete("settings", "ai_api_key");
    this.apiKey = null;
    this.broadcast();
  }

  setLoading(val: boolean) {
    this.isLoading = val;
    this.broadcast();
  }

  setStyle(title: string | null) {
    this.activeStyleTitle = title;
    this.broadcast();
  }

  get modelName() {
    return this.tier === "advanced"
      ? "gemini-3-flash-preview"
      : "gemini-flash-lite-latest";
  }

  get effectiveApiKey() {
    if (this.tier === "advanced") return this.apiKey;
    const sharedKey =
      (typeof window !== "undefined" &&
        (window as any).__SHARED_GEMINI_KEY__) ||
      (import.meta as any).env?.VITE_SHARED_GEMINI_KEY;
    return this.apiKey || sharedKey || null;
  }

  get isEnabled() {
    return !!this.effectiveApiKey;
  }
}
