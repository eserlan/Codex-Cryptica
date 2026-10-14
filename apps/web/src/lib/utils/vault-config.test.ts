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

  it("coordinates updates from separate updater instances with a shared lock", async () => {
    let configText = JSON.stringify({ existing: "preserved" });
    const vaultDir = {} as FileSystemDirectoryHandle;
    const lockTails = new Map<string, Promise<void>>();
    const withLock = async <T>(
      name: string,
      operation: () => Promise<T>,
    ): Promise<T> => {
      const previous = lockTails.get(name) ?? Promise.resolve();
      let release!: () => void;
      const tail = new Promise<void>((resolve) => {
        release = resolve;
      });
      lockTails.set(name, tail);
      await previous;
      try {
        return await operation();
      } finally {
        release();
        if (lockTails.get(name) === tail) lockTails.delete(name);
      }
    };
    const dependencies = {
      getOpfsRoot: vi.fn().mockResolvedValue({} as FileSystemDirectoryHandle),
      getVaultDir: vi.fn().mockResolvedValue(vaultDir),
      readFileAsText: vi.fn(async () => configText),
      writeOpfsFile: vi.fn(async (_path, content) => {
        configText = content;
      }),
      withLock,
    };
    // Separate updater instances model separate tabs, each with its own queue.
    const firstTab = createVaultConfigUpdater(dependencies);
    const secondTab = createVaultConfigUpdater(dependencies);

    await Promise.all([
      firstTab("vault-1", (config) => {
        config.systemId = "tov";
      }),
      secondTab("vault-1", (config) => {
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
