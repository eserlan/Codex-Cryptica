import { describe, it, expect, beforeEach, vi } from "vitest";
import { OracleSettingsManager } from "../settings-manager.svelte";
import type { IOracleStore } from "../types";

describe("OracleSettingsManager", () => {
  let manager: OracleSettingsManager;
  let mockStore: any;
  let mockSettingsService: any;

  beforeEach(() => {
    mockSettingsService = {
      settings: { apiKey: "test-key", modelName: "test-model" },
      isLoading: false,
      activeStyleTitle: "Test Style",
      init: vi.fn().mockResolvedValue(undefined),
      updateSettings: vi.fn().mockImplementation(async (s) => {
        mockSettingsService.settings = {
          ...mockSettingsService.settings,
          ...s,
        };
      }),
    };

    mockStore = {
      settingsService: mockSettingsService,
    };

    manager = new OracleSettingsManager(mockStore as IOracleStore);
  });

  it("should expose settings from service", () => {
    expect(manager.settings).toEqual({
      apiKey: "test-key",
      modelName: "test-model",
    });
    expect(manager.apiKey).toBe("test-key");
    expect(manager.modelName).toBe("test-model");
  });

  it("should update settings via service", async () => {
    await manager.updateSettings({ apiKey: "new-key" });
    expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
      apiKey: "new-key",
    });
    expect(manager.apiKey).toBe("new-key");
  });

  it("should set key", async () => {
    await manager.setKey("another-key");
    expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
      apiKey: "another-key",
    });
  });

  it("should clear key", async () => {
    await manager.clearKey();
    expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
      apiKey: undefined,
    });
  });

  it("should expose loading state", () => {
    mockSettingsService.isLoading = true;
    expect(manager.isLoading).toBe(true);
  });
});
