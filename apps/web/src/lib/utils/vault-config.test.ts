import { afterEach, describe, expect, it, vi } from "vitest";
import { createVaultConfigUpdater } from "./vault-config";
import { entityDb } from "./entity-db";

describe("vault config updates", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("uses the browser lock name and serializes default updates when Web Locks exist", async () => {
    let configText = JSON.stringify({ existing: "preserved" });
    const vaultDir = {} as FileSystemDirectoryHandle;
    const tails = new Map<string, Promise<void>>();
    const request = vi.fn(
      async <T>(name: string, operation: () => Promise<T>) => {
        const previous = tails.get(name) ?? Promise.resolve();
        let release!: () => void;
        const tail = new Promise<void>((resolve) => {
          release = resolve;
        });
        tails.set(name, tail);
        await previous;
        try {
          return await operation();
        } finally {
          release();
          if (tails.get(name) === tail) tails.delete(name);
        }
      },
    );
    vi.stubGlobal("navigator", { locks: { request } });
    const dependencies = {
      getOpfsRoot: vi.fn().mockResolvedValue({} as FileSystemDirectoryHandle),
      getVaultDir: vi.fn().mockResolvedValue(vaultDir),
      readFileAsText: vi.fn(async () => configText),
      writeOpfsFile: vi.fn(async (_path, content) => {
        configText = content;
      }),
    };
    const firstTab = createVaultConfigUpdater(dependencies);
    const secondTab = createVaultConfigUpdater(dependencies);

    await Promise.all([
      firstTab("vault-web-lock", (config) => {
        config.systemId = "tov";
      }),
      secondTab("vault-web-lock", (config) => {
        config.theme = "fantasy";
      }),
    ]);

    expect(request).toHaveBeenCalledWith(
      "codex-vault-config:vault-web-lock",
      expect.any(Function),
    );
    expect(JSON.parse(configText)).toEqual({
      existing: "preserved",
      systemId: "tov",
      theme: "fantasy",
    });
  });

  it("serializes separate default updaters through IndexedDB when Web Locks are absent", async () => {
    let configText = JSON.stringify({ existing: "preserved" });
    const vaultDir = {} as FileSystemDirectoryHandle;
    vi.stubGlobal("navigator", {});
    const dependencies = {
      getOpfsRoot: vi.fn().mockResolvedValue({} as FileSystemDirectoryHandle),
      getVaultDir: vi.fn().mockResolvedValue(vaultDir),
      readFileAsText: vi.fn(async () => configText),
      writeOpfsFile: vi.fn(async (_path, content) => {
        configText = content;
      }),
    };
    const firstTab = createVaultConfigUpdater(dependencies);
    const secondTab = createVaultConfigUpdater(dependencies);

    await Promise.all([
      firstTab("vault-indexeddb-lock", (config) => {
        config.systemId = "tov";
      }),
      secondTab("vault-indexeddb-lock", (config) => {
        config.theme = "fantasy";
      }),
    ]);

    expect(JSON.parse(configText)).toEqual({
      existing: "preserved",
      systemId: "tov",
      theme: "fantasy",
    });
  });

  const makeDeps = (readFileAsText: (...args: never[]) => Promise<string>) => ({
    getOpfsRoot: vi.fn().mockResolvedValue({} as FileSystemDirectoryHandle),
    getVaultDir: vi.fn().mockResolvedValue({} as FileSystemDirectoryHandle),
    readFileAsText: vi.fn(readFileAsText),
    writeOpfsFile: vi.fn().mockResolvedValue(undefined),
  });

  it("does not overwrite a config that cannot be parsed", async () => {
    const deps = makeDeps(async () => "{ not json");
    const update = createVaultConfigUpdater(deps);

    await expect(
      update("vault-corrupt", (config) => {
        config.systemId = "tov";
      }),
    ).rejects.toThrow();
    expect(deps.writeOpfsFile).not.toHaveBeenCalled();
  });

  it("does not overwrite a config when the read fails for a non-missing reason", async () => {
    const deps = makeDeps(async () => {
      throw new Error("OPFS read failed");
    });
    const update = createVaultConfigUpdater(deps);

    await expect(
      update("vault-read-fail", (config) => {
        config.systemId = "tov";
      }),
    ).rejects.toThrow("OPFS read failed");
    expect(deps.writeOpfsFile).not.toHaveBeenCalled();
  });

  it("starts from an empty config when the file does not exist", async () => {
    const deps = makeDeps(async () => {
      const error = new Error("File not found");
      error.name = "NotFoundError";
      throw error;
    });
    const update = createVaultConfigUpdater(deps);

    await update("vault-missing", (config) => {
      config.systemId = "tov";
    });

    expect(JSON.parse(deps.writeOpfsFile.mock.calls[0][1] as string)).toEqual({
      systemId: "tov",
    });
  });

  it("refuses to write when the IndexedDB lock lease was taken over", async () => {
    vi.stubGlobal("navigator", {});
    const now = 1000;
    const clock = { now: () => now };
    const deps = {
      ...makeDeps(async () => JSON.stringify({ existing: true })),
      clock,
    };
    const update = createVaultConfigUpdater(deps);

    await expect(
      update("vault-lease-lost", async (config) => {
        config.systemId = "tov";
        await entityDb.appSettings.put({
          key: "vault-config-lock:codex-vault-config:vault-lease-lost",
          value: { owner: "another-tab", expiresAt: clock.now() + 60_000 },
          updatedAt: clock.now(),
        });
      }),
    ).rejects.toThrow("lock was lost");
    expect(deps.writeOpfsFile).not.toHaveBeenCalled();
  });
});
