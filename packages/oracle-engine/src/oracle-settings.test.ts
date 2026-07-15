import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEFAULT_CF_IMAGE_MODEL,
  DEFAULT_CUSTOM_IMAGE_BASE_URL,
  DEFAULT_CUSTOM_IMAGE_MODEL,
  OracleSettingsService,
} from "./index";

// Mock EntityDb
class MockEntityDb {
  appSettings = {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}

describe("OracleSettingsService", () => {
  let mockDb: MockEntityDb;

  beforeEach(() => {
    mockDb = new MockEntityDb();
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      const service = new OracleSettingsService();

      expect(service.apiKey).toBe(null);
      expect(service.tier).toBe("lite");
      expect(service.isLoading).toBe(false);
      expect(service.activeStyleTitle).toBe(null);
      expect(service.imageProvider).toBe("cloudflare");
      expect(service.customImageBaseUrl).toBe(DEFAULT_CUSTOM_IMAGE_BASE_URL);
      expect(service.customImageModel).toBe(DEFAULT_CUSTOM_IMAGE_MODEL);
      expect(service.cloudflareModel).toBe(DEFAULT_CF_IMAGE_MODEL);
    });

    it("should accept optional db in constructor", () => {
      const service = new OracleSettingsService(mockDb as any);
      expect(service).toBeDefined();
    });
  });

  describe("init", () => {
    it("should load api key from database", async () => {
      mockDb.appSettings.get.mockResolvedValueOnce({ value: "test-key" });
      mockDb.appSettings.get.mockResolvedValueOnce({ value: "advanced" });

      const service = new OracleSettingsService();
      await service.init(mockDb as any);

      expect(service.apiKey).toBe("test-key");
      expect(service.tier).toBe("advanced");
      expect(mockDb.appSettings.get).toHaveBeenCalledWith("ai_api_key");
      expect(mockDb.appSettings.get).toHaveBeenCalledWith("ai_tier");
    });

    it("should handle missing settings gracefully", async () => {
      mockDb.appSettings.get.mockResolvedValueOnce(undefined);
      mockDb.appSettings.get.mockResolvedValueOnce(undefined);

      const service = new OracleSettingsService();
      await service.init(mockDb as any);

      expect(service.apiKey).toBe(null);
      expect(service.tier).toBe("lite");
      expect(service.imageProvider).toBe("cloudflare");
      expect(service.customImageBaseUrl).toBe(DEFAULT_CUSTOM_IMAGE_BASE_URL);
      expect(service.customImageModel).toBe(DEFAULT_CUSTOM_IMAGE_MODEL);
      expect(service.cloudflareModel).toBe(DEFAULT_CF_IMAGE_MODEL);
    });

    it("should preserve gemini as image provider when no API key is set", async () => {
      mockDb.appSettings.get.mockResolvedValueOnce(undefined);
      mockDb.appSettings.get.mockResolvedValueOnce(undefined);
      mockDb.appSettings.get.mockResolvedValueOnce({ value: "gemini" });
      mockDb.appSettings.get.mockResolvedValueOnce(undefined);
      mockDb.appSettings.get.mockResolvedValueOnce(undefined);
      mockDb.appSettings.get.mockResolvedValueOnce(undefined);

      const service = new OracleSettingsService();
      await service.init(mockDb as any);

      expect(service.apiKey).toBe(null);
      expect(service.imageProvider).toBe("gemini");
    });
  });

  describe("setTier", () => {
    it("should save tier to database and broadcast", async () => {
      const service = new OracleSettingsService(undefined, { now: () => 1234567890 });
      await service.init(mockDb as any);

      await service.setTier("lite");

      expect(service.tier).toBe("lite");
      expect(mockDb.appSettings.put).toHaveBeenCalledWith({
        key: "ai_tier",
        value: "lite",
        updatedAt: 1234567890,
      });
    });
  });

  describe("setKey", () => {
    it("should save api key to database and broadcast", async () => {
      const service = new OracleSettingsService(undefined, { now: () => 1234567890 });
      await service.init(mockDb as any);

      await service.setKey("new-key");

      expect(service.apiKey).toBe("new-key");
      expect(mockDb.appSettings.put).toHaveBeenCalledWith({
        key: "ai_api_key",
        value: "new-key",
        updatedAt: 1234567890,
      });
    });
  });

  describe("clearKey", () => {
    it("should remove api key from database and broadcast", async () => {
      const service = new OracleSettingsService();
      await service.init(mockDb as any);
      service.apiKey = "existing-key";

      await service.clearKey();

      expect(service.apiKey).toBe(null);
      expect(mockDb.appSettings.delete).toHaveBeenCalledWith("ai_api_key");
    });
  });

  describe("connectionMode", () => {
    it("should return custom-key when api key is set", () => {
      const service = new OracleSettingsService();
      service.apiKey = "test-key";

      expect(service.connectionMode).toBe("custom-key");
    });

    it("should return system-proxy when no api key", () => {
      const service = new OracleSettingsService();

      expect(service.connectionMode).toBe("system-proxy");
    });
  });

  describe("effectiveApiKey", () => {
    it("should return user api key when set", () => {
      const service = new OracleSettingsService();
      service.apiKey = "user-key";

      expect(service.effectiveApiKey).toBe("user-key");
    });

    it("should return null when no user key (proxy mode)", () => {
      const service = new OracleSettingsService();

      expect(service.effectiveApiKey).toBe(null);
    });
  });

  describe("isEnabled", () => {
    it("should always return true", () => {
      const service = new OracleSettingsService();

      expect(service.isEnabled).toBe(true);

      service.apiKey = "key";
      expect(service.isEnabled).toBe(true);

      service.apiKey = null;
      expect(service.isEnabled).toBe(true);
    });
  });

  describe("modelName", () => {
    it("should return gemini-3-flash-preview for advanced tier", () => {
      const service = new OracleSettingsService();
      service.tier = "advanced";

      expect(service.modelName).toBe("gemini-3-flash-preview");
    });

    it("should return gemini-3.1-flash-lite for lite tier", () => {
      const service = new OracleSettingsService();
      service.tier = "lite";

      expect(service.modelName).toBe("gemini-3.1-flash-lite");
    });
  });
});
