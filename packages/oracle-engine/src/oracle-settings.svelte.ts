/**
 * Minimal interface for app settings persistence.
 * Defined here to avoid cross-package coupling with web app's EntityDb.
 */
interface AppSettingsStore {
  appSettings: {
    get(key: string): Promise<{ value: any } | undefined>;
    put(record: { key: string; value: any; updatedAt: number }): Promise<void>;
    delete(key: string): Promise<void>;
  };
}

/**
 * Connection mode for the Oracle service.
 * - `system-proxy`: Uses the Cloudflare Worker proxy (no user API key required)
 * - `custom-key`: Uses the user's own Gemini API key directly
 */
export type ConnectionMode = "system-proxy" | "custom-key";

/**
 * OracleSettingsService manages Oracle configuration and state.
 *
 * Features:
 * - Dual-path support (System Proxy or Custom API Key)
 * - Cross-tab synchronization via BroadcastChannel
 * - Persistent storage via EntityDb (Dexie)
 * - Reactive state using Svelte 5 runes
 *
 * @example
 * ```typescript
 * const settings = new OracleSettingsService();
 * await settings.init(entityDb);
 *
 * // Check connection mode
 * if (settings.connectionMode === "system-proxy") {
 *   console.log("Using free system proxy");
 * }
 *
 * // Set user's API key
 * await settings.setKey("user-api-key");
 * ```
 */
export class OracleSettingsService {
  /** Current API key (null for system proxy mode) */
  apiKey = $state<string | null>(null);

  /** Model tier: "lite" or "advanced" */
  tier = $state<"lite" | "advanced">("advanced");

  /** Loading state for async operations */
  isLoading = $state(false);

  /** Currently active style title (for AI art generation) */
  activeStyleTitle = $state<string | null>(null);

  private channel: BroadcastChannel | null = null;
  private db: AppSettingsStore | null = null;

  /**
   * Creates a new OracleSettingsService instance.
   *
   * @param db - Optional EntityDb instance for persistence (can be provided later via init)
   */
  constructor(db?: AppSettingsStore) {
    if (db) {
      this.db = db;
    }
    if (typeof window !== "undefined") {
      this.channel = new BroadcastChannel("codex-oracle-sync");
      this.channel.onmessage = (event) => {
        const { type, data } = event.data;
        if (type === "SYNC_STATE") {
          this.isLoading = data.isLoading;
          this.apiKey = data.apiKey;
          this.tier = data.tier || "advanced";
          this.activeStyleTitle = data.activeStyleTitle || null;
        } else if (type === "REQUEST_STATE") {
          this.broadcast();
        }
      };
      this.channel.postMessage({ type: "REQUEST_STATE" });
    }
  }

  /**
   * Initializes the service by loading settings from IndexedDB.
   * Also requests current state from other tabs via BroadcastChannel.
   *
   * @param db - The EntityDb instance for persistence
   */
  async init(db: AppSettingsStore) {
    this.db = db;
    const setting = await db.appSettings.get("ai_api_key");
    this.apiKey = setting?.value ?? null;

    const tierSetting = await db.appSettings.get("ai_tier");
    this.tier = tierSetting?.value ?? "advanced";
    this.broadcast();
  }

  /**
   * Broadcasts current state to all other tabs via BroadcastChannel.
   * Used for cross-tab synchronization.
   */
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

  /**
   * Sets the model tier and persists to IndexedDB.
   *
   * @param tier - The model tier ("lite" or "advanced")
   */
  async setTier(tier: "lite" | "advanced") {
    if (this.db) {
      await this.db.appSettings.put({
        key: "ai_tier",
        value: tier,
        updatedAt: Date.now(),
      });
    }
    this.tier = tier;
    this.broadcast();
  }

  /**
   * Sets the user's API key and persists to IndexedDB.
   * Switches to "custom-key" connection mode.
   *
   * @param key - The Google Gemini API key
   */
  async setKey(key: string) {
    if (this.db) {
      await this.db.appSettings.put({
        key: "ai_api_key",
        value: key,
        updatedAt: Date.now(),
      });
    }
    this.apiKey = key;
    this.broadcast();
  }

  /**
   * Clears the user's API key from IndexedDB.
   * Switches back to "system-proxy" connection mode.
   */
  async clearKey() {
    if (this.db) {
      await this.db.appSettings.delete("ai_api_key");
    }
    this.apiKey = null;
    this.broadcast();
  }

  /**
   * Sets the loading state for async operations.
   *
   * @param val - The loading state (true = loading, false = idle)
   */
  setLoading(val: boolean) {
    this.isLoading = val;
    this.broadcast();
  }

  /**
   * Sets the active style title for AI art generation.
   *
   * @param title - The style title (e.g., "Fantasy Portrait", "Sci-Fi Landscape")
   */
  setStyle(title: string | null) {
    this.activeStyleTitle = title;
    this.broadcast();
  }

  /**
   * Gets the current connection mode.
   *
   * @returns "custom-key" if user has API key, "system-proxy" otherwise
   */
  get connectionMode(): ConnectionMode {
    return this.apiKey ? "custom-key" : "system-proxy";
  }

  /**
   * Gets the model name for the current tier.
   *
   * @returns The Gemini model identifier
   */
  get modelName() {
    return this.tier === "advanced"
      ? "gemini-3-flash-preview"
      : "gemini-2.0-flash-lite";
  }

  /**
   * Gets the effective API key for requests.
   *
   * Returns:
   * - User's API key if in "custom-key" mode
   * - null if in "system-proxy" mode (proxy handles authentication)
   *
   * @returns The API key or null for proxy mode
   */
  get effectiveApiKey() {
    if (this.apiKey) {
      // User provided key - use directly (Custom Key mode)
      return this.apiKey;
    }
    // No user key - use system proxy (no key needed on client)
    return null;
  }

  /**
   * Checks if the Oracle is enabled.
   *
   * @returns Always true - Oracle works in both proxy and custom key modes
   */
  get isEnabled() {
    return true; // Always enabled - either proxy or custom key
  }
}
