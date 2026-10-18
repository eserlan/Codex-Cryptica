import { describe, expect, it } from "vitest";
import { AdventureControlAuthority } from "./adventure-control-lease";

function fakeDb() {
  const rows = new Map<string, any>();
  const appSettings = {
    async get(key: string) {
      return rows.get(key);
    },
    async put(value: any) {
      rows.set(value.key, value);
    },
    async delete(key: string) {
      rows.delete(key);
    },
  };
  return {
    appSettings,
    async transaction(_mode: string, _table: unknown, callback: () => unknown) {
      return callback();
    },
  };
}

describe("AdventureControlAuthority", () => {
  it("fences concurrent owners and permits takeover after expiry", async () => {
    let time = 1_000;
    const db = fakeDb();
    const authority = new AdventureControlAuthority(
      db as any,
      { now: () => time },
      { uuid: () => "owner-1" },
    );
    const key = { vaultId: "vault-1", sessionId: "session-1" };
    const first = await authority.acquire(key);
    expect(first.ok).toBe(true);
    expect((await authority.acquire(key)).ok).toBe(false);
    time += 11_000;
    const takeover = await authority.acquire(key);
    expect(takeover.ok).toBe(true);
    if (first.ok && takeover.ok) {
      expect(takeover.lease.fencingToken).toBeGreaterThan(
        first.lease.fencingToken,
      );
      expect(await authority.verify(first.lease)).toBe(false);
    }
  });

  it("does not release a newer owner with a stale lease", async () => {
    const db = fakeDb();
    let owner = "one";
    const authority = new AdventureControlAuthority(
      db as any,
      { now: () => 1_000 },
      { uuid: () => owner },
    );
    const key = { vaultId: "vault-1", sessionId: "session-1" };
    const first = await authority.acquire(key);
    owner = "two";
    await authority.release(
      first.ok
        ? { ...first.lease, ownerId: "stale-owner" }
        : { ...key, ownerId: "none", fencingToken: 0, expiresAt: 0 },
    );
    expect((await authority.acquire(key)).ok).toBe(false);
  });
});
