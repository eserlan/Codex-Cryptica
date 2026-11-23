import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureGDriveSyncLoader,
  loadGDriveSync,
} from "./gdrive-sync-loader.js";

describe("GDrive sync loader", () => {
  beforeEach(() => {
    configureGDriveSyncLoader(() => ({}) as any);
  });

  it("configures and initializes the module on first use, then reuses it", async () => {
    const configure = vi.fn();
    const init = vi.fn().mockResolvedValue(undefined);
    const loader = vi.fn().mockResolvedValue({
      configureGDriveSync: configure,
      initGDriveSync: init,
    });
    const config = { vault: "test" } as any;
    configureGDriveSyncLoader(() => config, loader);

    const first = await loadGDriveSync();
    const second = await loadGDriveSync();

    expect(first).toBe(second);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(configure).toHaveBeenCalledWith(config);
    expect(init).toHaveBeenCalledTimes(1);
  });

  it("allows retry after the module import fails", async () => {
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error("chunk unavailable"))
      .mockResolvedValueOnce({
        configureGDriveSync: vi.fn(),
        initGDriveSync: vi.fn().mockResolvedValue(undefined),
      });
    configureGDriveSyncLoader(() => ({}) as any, loader);

    await expect(loadGDriveSync()).rejects.toThrow("chunk unavailable");
    await expect(loadGDriveSync()).resolves.toBeDefined();
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
