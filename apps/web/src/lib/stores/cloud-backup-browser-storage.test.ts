import { describe, expect, it } from "vitest";
import type { StorageLike } from "$lib/utils/runtime-deps";
import { cloudBackupBrowserStorage } from "./cloud-backup-browser-storage";

describe("cloudBackupBrowserStorage", () => {
  it("persists per-vault records and lists only valid cloud backup entries", async () => {
    const values = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
      get length() {
        return values.size;
      },
      key: (index) => [...values.keys()][index] ?? null,
    };
    const persistence = cloudBackupBrowserStorage(storage);
    const record = { enabled: true, ownerCode: "secret-code" };

    await persistence.write("vault-a", record);
    await persistence.write("vault-b", { enabled: false });
    storage.setItem("unrelated-setting", "ignored");
    storage.setItem("codex.cloud-backup.broken", "{");

    expect(await persistence.read("vault-a")).toEqual(record);
    expect(await persistence.read("missing")).toBeNull();
    expect(await persistence.list()).toEqual([
      { vaultId: "vault-a", record },
      { vaultId: "vault-b", record: { enabled: false } },
    ]);

    await persistence.clear("vault-a");
    expect(await persistence.read("vault-a")).toBeNull();
  });

  it("degrades safely when storage operations throw", async () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
      key: () => {
        throw new Error("blocked");
      },
      length: 1,
    } as StorageLike;
    const persistence = cloudBackupBrowserStorage(storage);

    await expect(persistence.read("vault-a")).resolves.toBeNull();
    await expect(persistence.write("vault-a", { enabled: true })).resolves.toBe(
      undefined,
    );
    await expect(persistence.clear("vault-a")).resolves.toBe(undefined);
    await expect(persistence.list()).resolves.toEqual([]);
  });
});
