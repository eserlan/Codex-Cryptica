import { describe, it, expect, vi, beforeEach } from "vitest";
import { OracleSettingsService } from "./oracle-settings.svelte";

describe("OracleSettingsService", () => {
  let service: OracleSettingsService;
  let mockDB: any;

  beforeEach(() => {
    vi.stubGlobal(
      "BroadcastChannel",
      vi.fn().mockImplementation(
        class {
          postMessage = vi.fn();
          onmessage = null;
        },
      ),
    );

    service = new OracleSettingsService();
    mockDB = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
  });

  it("should initialize from DB", async () => {
    mockDB.get
      .mockResolvedValueOnce("stored-key")
      .mockResolvedValueOnce("advanced");
    await service.init(mockDB);
    expect(service.apiKey).toBe("stored-key");
    expect(service.tier).toBe("advanced");
  });

  it("should update and persist key", async () => {
    await service.init(mockDB);
    await service.setKey("new-key");
    expect(service.apiKey).toBe("new-key");
    expect(mockDB.put).toHaveBeenCalledWith(
      "settings",
      "new-key",
      "ai_api_key",
    );
  });

  it("should update and persist tier", async () => {
    await service.init(mockDB);
    await service.setTier("advanced");
    expect(service.tier).toBe("advanced");
    expect(mockDB.put).toHaveBeenCalledWith("settings", "advanced", "ai_tier");
  });

  it("should handle loading state", () => {
    service.setLoading(true);
    expect(service.isLoading).toBe(true);
    service.setLoading(false);
    expect(service.isLoading).toBe(false);
  });

  it("should clear key", async () => {
    await service.init(mockDB);
    await service.setKey("k");
    await service.clearKey();
    expect(service.apiKey).toBeNull();
    expect(mockDB.delete).toHaveBeenCalledWith("settings", "ai_api_key");
  });

  it("should set style", () => {
    service.setStyle("cool-theme");
    expect(service.activeStyleTitle).toBe("cool-theme");
  });

  it("should handle SYNC_STATE message", () => {
    const channel = (service as any).channel;
    channel.onmessage({
      data: {
        type: "SYNC_STATE",
        data: {
          apiKey: "sync-key",
          tier: "advanced",
          isLoading: true,
          activeStyleTitle: "s",
        },
      },
    });
    expect(service.apiKey).toBe("sync-key");
    expect(service.tier).toBe("advanced");
    expect(service.isLoading).toBe(true);
  });

  it("should handle REQUEST_STATE message", () => {
    const channel = (service as any).channel;
    const spy = vi.spyOn(channel, "postMessage");
    channel.onmessage({ data: { type: "REQUEST_STATE" } });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SYNC_STATE" }),
    );
  });

  describe("getters", () => {
    it("should return correct modelName based on tier", () => {
      service.tier = "lite";
      expect(service.modelName).toBe("gemini-flash-lite-latest");
      service.tier = "advanced";
      expect(service.modelName).toBe("gemini-3-flash-preview");
    });

    it("should return effectiveApiKey (including shared key)", () => {
      service.tier = "lite";
      service.apiKey = null;
      vi.stubGlobal("__SHARED_GEMINI_KEY__", "shared-123");
      expect(service.effectiveApiKey).toBe("shared-123");

      service.apiKey = "user-key";
      expect(service.effectiveApiKey).toBe("user-key");

      vi.unstubAllGlobals();
    });

    it("should return isEnabled status", () => {
      service.apiKey = "k";
      expect(service.isEnabled).toBe(true);
      service.apiKey = null;
      expect(service.isEnabled).toBe(false);
    });
  });
});
