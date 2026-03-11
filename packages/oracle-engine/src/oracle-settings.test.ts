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
});
