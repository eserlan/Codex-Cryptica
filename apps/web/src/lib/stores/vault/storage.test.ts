import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock("../../utils/idb", () => ({ getDB: vi.fn(async () => db) }));
vi.mock("../debug.svelte", () => ({ debugStore: { warn: vi.fn() } }));

import { VaultStorageManager } from "./storage";

describe("VaultStorageManager.getActiveFolderHandle", () => {
  beforeEach(() => {
    db.get.mockReset();
  });

  it("shares one read between concurrent callers", async () => {
    const handle = { name: "folder" };
    db.get.mockResolvedValue(handle);
    const storage = new VaultStorageManager({ getRootHandle: () => undefined });

    const results = await Promise.all(
      Array.from({ length: 50 }, () => storage.getActiveFolderHandle("v1")),
    );

    expect(results.every((r) => r === handle)).toBe(true);
    expect(db.get).toHaveBeenCalledTimes(1);
  });

  it("reads fresh once the previous read has settled", async () => {
    const settings = new Map<string, unknown>();
    db.get.mockImplementation(async (_store: string, key: string) =>
      settings.get(key),
    );
    const storage = new VaultStorageManager({ getRootHandle: () => undefined });

    expect(await storage.getActiveFolderHandle("v1")).toBeUndefined();
    // A folder picked between two reads must not be hidden by the first.
    settings.set("folderHandle_v1", { name: "picked" });
    expect(await storage.getActiveFolderHandle("v1")).toEqual({
      name: "picked",
    });
  });

  it("does not share a read across vaults", async () => {
    const settings = new Map<string, unknown>([
      ["folderHandle_v1", { name: "one" }],
      ["folderHandle_v2", { name: "two" }],
    ]);
    db.get.mockImplementation(async (_store: string, key: string) =>
      settings.get(key),
    );
    const storage = new VaultStorageManager({ getRootHandle: () => undefined });

    const [one, two] = await Promise.all([
      storage.getActiveFolderHandle("v1"),
      storage.getActiveFolderHandle("v2"),
    ]);

    expect(one).toEqual({ name: "one" });
    expect(two).toEqual({ name: "two" });
  });
});
