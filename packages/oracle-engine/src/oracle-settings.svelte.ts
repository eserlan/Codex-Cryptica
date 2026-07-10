import type { ConnectionMode } from "./types";
import {
  DEFAULT_CF_IMAGE_MODEL,
  DEFAULT_CUSTOM_IMAGE_MODEL,
  DEFAULT_CUSTOM_IMAGE_BASE_URL,
} from "./image-defaults";
import { systemClock, type Clock } from "./runtime";

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
  tier = $state<"lite" | "advanced">("lite");

  /** Loading state for async operations */
  isLoading = $state(false);

  /** Currently active style title (for AI art generation) */
  activeStyleTitle = $state<string | null>(null);

  /** Image Provider Setting */
  imageProvider = $state<"gemini" | "cloudflare" | "custom">("cloudflare");
  customImageBaseUrl = $state<string>(DEFAULT_CUSTOM_IMAGE_BASE_URL);
  customImageApiKey = $state<string>("");
  customImageModel = $state<string>(DEFAULT_CUSTOM_IMAGE_MODEL);

  cloudflareAccountId = $state<string>("");
  cloudflareApiToken = $state<string>("");
  cloudflareModel = $state<string>(DEFAULT_CF_IMAGE_MODEL);

  private channel: BroadcastChannel | null = null;
  private db: AppSettingsStore | null = null;
  private clock: Clock;

  /**
   * Creates a new OracleSettingsService instance.
   *
   * @param db - Optional EntityDb instance for persistence (can be provided later via init)
   */
  constructor(db?: AppSettingsStore, clock: Clock = systemClock) {
    this.clock = clock;
    if (db) {
      this.db = db;
    }
    if (typeof window !== "undefined") {
      this.channel = new BroadcastChannel("codex-oracle-sync");
      this.channel.onmessage = (event) => {
        const { type, data } = event.data;
        if (type === "SYNC_STATE") {
          this.apiKey = data.apiKey;
          this.tier = data.tier || "advanced";
          this.activeStyleTitle = data.activeStyleTitle || null;
          this.imageProvider = data.imageProvider || "cloudflare";
          this.customImageBaseUrl = data.customImageBaseUrl || "";
          this.customImageApiKey = data.customImageApiKey || "";
          this.customImageModel = data.customImageModel || "";
          this.cloudflareAccountId = data.cloudflareAccountId || "";
          this.cloudflareApiToken = data.cloudflareApiToken || "";
          this.cloudflareModel = data.cloudflareModel || "";
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
    this.tier = tierSetting?.value ?? "lite";

    const providerSetting = await db.appSettings.get("image_provider");
    this.imageProvider = providerSetting?.value ?? "cloudflare";
    const baseUrlSetting = await db.appSettings.get("custom_image_base_url");
    this.customImageBaseUrl =
      baseUrlSetting?.value ?? DEFAULT_CUSTOM_IMAGE_BASE_URL;
    const apiKeySetting = await db.appSettings.get("custom_image_api_key");
    this.customImageApiKey = apiKeySetting?.value ?? "";
    const modelSetting = await db.appSettings.get("custom_image_model");
    this.customImageModel = modelSetting?.value ?? DEFAULT_CUSTOM_IMAGE_MODEL;

    const cfAccountIdSetting = await db.appSettings.get(
      "cloudflare_account_id",
    );
    this.cloudflareAccountId = cfAccountIdSetting?.value ?? "";
    const cfApiTokenSetting = await db.appSettings.get("cloudflare_api_token");
    this.cloudflareApiToken = cfApiTokenSetting?.value ?? "";
    const cfModelSetting = await db.appSettings.get("cloudflare_model");
    this.cloudflareModel = cfModelSetting?.value ?? DEFAULT_CF_IMAGE_MODEL;

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
        apiKey: this.apiKey,
        tier: this.tier,
        activeStyleTitle: this.activeStyleTitle,
        imageProvider: this.imageProvider,
        customImageBaseUrl: this.customImageBaseUrl,
        customImageApiKey: this.customImageApiKey,
        customImageModel: this.customImageModel,
        cloudflareAccountId: this.cloudflareAccountId,
        cloudflareApiToken: this.cloudflareApiToken,
        cloudflareModel: this.cloudflareModel,
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
        updatedAt: this.clock.now(),
      });
    }
    this.tier = tier;
    this.broadcast();
  }

  /**
   * Sets the custom image provider settings.
   */
  async setCustomImageSettings(settings: {
    provider?: "gemini" | "cloudflare" | "custom";
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    cloudflareAccountId?: string;
    cloudflareApiToken?: string;
    cloudflareModel?: string;
  }) {
    if (this.db) {
      if (settings.provider !== undefined)
        await this.db.appSettings.put({
          key: "image_provider",
          value: settings.provider,
          updatedAt: this.clock.now(),
        });
      if (settings.baseUrl !== undefined)
        await this.db.appSettings.put({
          key: "custom_image_base_url",
          value: settings.baseUrl,
          updatedAt: this.clock.now(),
        });
      if (settings.apiKey !== undefined)
        await this.db.appSettings.put({
          key: "custom_image_api_key",
          value: settings.apiKey,
          updatedAt: this.clock.now(),
        });
      if (settings.model !== undefined)
        await this.db.appSettings.put({
          key: "custom_image_model",
          value: settings.model,
          updatedAt: this.clock.now(),
        });
      if (settings.cloudflareAccountId !== undefined)
        await this.db.appSettings.put({
          key: "cloudflare_account_id",
          value: settings.cloudflareAccountId,
          updatedAt: this.clock.now(),
        });
      if (settings.cloudflareApiToken !== undefined)
        await this.db.appSettings.put({
          key: "cloudflare_api_token",
          value: settings.cloudflareApiToken,
          updatedAt: this.clock.now(),
        });
      if (settings.cloudflareModel !== undefined)
        await this.db.appSettings.put({
          key: "cloudflare_model",
          value: settings.cloudflareModel,
          updatedAt: this.clock.now(),
        });
    }
    if (settings.provider !== undefined) this.imageProvider = settings.provider;
    if (settings.baseUrl !== undefined)
      this.customImageBaseUrl = settings.baseUrl;
    if (settings.apiKey !== undefined) this.customImageApiKey = settings.apiKey;
    if (settings.model !== undefined) this.customImageModel = settings.model;
    if (settings.cloudflareAccountId !== undefined)
      this.cloudflareAccountId = settings.cloudflareAccountId;
    if (settings.cloudflareApiToken !== undefined)
      this.cloudflareApiToken = settings.cloudflareApiToken;
    if (settings.cloudflareModel !== undefined)
      this.cloudflareModel = settings.cloudflareModel;
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
        updatedAt: this.clock.now(),
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
      : "gemini-3.1-flash-lite";
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

  get settings() {
    return {
      apiKey: this.apiKey,
      tier: this.tier,
      modelName: this.modelName,
      activeStyleTitle: this.activeStyleTitle,
      connectionMode: this.connectionMode,
      imageProvider: this.imageProvider,
      customImageBaseUrl: this.customImageBaseUrl,
      customImageApiKey: this.customImageApiKey,
      customImageModel: this.customImageModel,
      cloudflareAccountId: this.cloudflareAccountId,
      cloudflareApiToken: this.cloudflareApiToken,
      cloudflareModel: this.cloudflareModel,
    };
  }

  async updateSettings(updates: any) {
    if (updates.apiKey !== undefined) {
      if (updates.apiKey === null || updates.apiKey === "") {
        await this.clearKey();
      } else {
        await this.setKey(updates.apiKey);
      }
    }
    if (updates.tier) await this.setTier(updates.tier);
    if (updates.activeStyleTitle !== undefined)
      this.setStyle(updates.activeStyleTitle);

    await this.setCustomImageSettings({
      provider: updates.imageProvider,
      baseUrl: updates.customImageBaseUrl,
      apiKey: updates.customImageApiKey,
      model: updates.customImageModel,
      cloudflareAccountId: updates.cloudflareAccountId,
      cloudflareApiToken: updates.cloudflareApiToken,
      cloudflareModel: updates.cloudflareModel,
    });
  }
}
