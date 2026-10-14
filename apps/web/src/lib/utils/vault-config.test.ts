import { describe, expect, it, vi } from "vitest";
import { createVaultConfigUpdater } from "./vault-config";

describe("vault config updates", () => {
  it("serializes settings updates so concurrent writes preserve both fields", async () => {
    let configText = JSON.stringify({ existing: "preserved" });
    const vaultDir = {} as FileSystemDirectoryHandle;
    const update = createVaultConfigUpdater({
      getOpfsRoot: vi.fn().mockResolvedValue({} as FileSystemDirectoryHandle),
      getVaultDir: vi.fn().mockResolvedValue(vaultDir),
      readFileAsText: vi.fn(async () => configText),
      writeOpfsFile: vi.fn(async (_path, content) => {
        configText = content;
      }),
    });

    await Promise.all([
      update("vault-1", (config) => {
        config.systemId = "tov";
      }),
      update("vault-1", (config) => {
        config.theme = "fantasy";
      }),
    ]);

    expect(JSON.parse(configText)).toEqual({
      existing: "preserved",
      systemId: "tov",
      theme: "fantasy",
    });
  });
});
