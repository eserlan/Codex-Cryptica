import { describe, expect, it } from "vitest";
import { SharedVaultIdentity } from "./shared-vault-identity";

function memoryStorage() {
  const items = new Map<string, string>();
  const writes: string[] = [];
  return {
    items,
    writes,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      writes.push(key);
      items.set(key, value);
    },
    removeItem: (key: string) => items.delete(key),
  };
}

describe("SharedVaultIdentity", () => {
  it("makes no id and writes nothing until the first join asks", () => {
    const storage = memoryStorage();
    const identity = new SharedVaultIdentity(storage, () => "device-aaaa1111");
    expect(identity.displayName()).toBeUndefined();
    expect(storage.writes).toEqual([]);
    expect(storage.items.size).toBe(0);
  });

  it("creates a well-formed id lazily, stores it and never rotates it", () => {
    const storage = memoryStorage();
    let n = 0;
    const identity = new SharedVaultIdentity(
      storage,
      () => `device-${++n}0000000`,
    );
    const id = identity.deviceId();
    expect(id).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    expect(identity.deviceId()).toBe(id);
    expect(
      new SharedVaultIdentity(storage, () => "other-12345678").deviceId(),
    ).toBe(id);
    expect(n).toBe(1);
    expect([...storage.items.keys()]).toEqual(["codex-shared-vault-identity"]);
  });

  it("works with the default random generator", () => {
    expect(new SharedVaultIdentity(memoryStorage()).deviceId()).toMatch(
      /^[A-Za-z0-9_-]{8,128}$/,
    );
  });

  it("keeps the name with the id and replaces a malformed stored id", () => {
    const storage = memoryStorage();
    const identity = new SharedVaultIdentity(storage, () => "device-aaaa1111");
    identity.setDisplayName("Zed");
    expect(identity.displayName()).toBe("Zed");
    expect(identity.deviceId()).toBe("device-aaaa1111");
    expect(identity.displayName()).toBe("Zed");

    storage.items.set(
      "codex-shared-vault-identity",
      JSON.stringify({ deviceId: "bad id!", displayName: "Zed" }),
    );
    expect(identity.deviceId()).toBe("device-aaaa1111");
  });

  it("survives unreadable stored data", () => {
    const storage = memoryStorage();
    storage.items.set("codex-shared-vault-identity", "{not json");
    const identity = new SharedVaultIdentity(storage, () => "device-aaaa1111");
    expect(identity.displayName()).toBeUndefined();
    expect(identity.deviceId()).toBe("device-aaaa1111");
  });
});
