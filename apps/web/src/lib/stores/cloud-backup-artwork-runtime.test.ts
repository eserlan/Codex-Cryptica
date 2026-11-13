import { describe, expect, it, vi } from "vitest";
import { createArtworkBackupRuntime } from "./cloud-backup-artwork-runtime";

describe("adventure backup browser runtime", () => {
  it("persists consent separately for each Vault under the shared lock", async () => {
    const values = new Map<string, unknown>();
    const request = vi.fn(
      async (
        _name: string,
        _options: LockOptions,
        action: () => Promise<unknown>,
      ) => action(),
    );
    const runtime = createArtworkBackupRuntime({
      read: async (key) => values.get(key),
      write: async (key, value) => {
        values.set(key, value);
      },
      locks: { request } as never,
      requireFullPush: async () => {},
      newRemovalId: () => "r1",
    });
    expect(await runtime.consent.enable("v1", true)).toBe(true);
    expect((await runtime.consent.read("v1")).enabled).toBe(true);
    expect((await runtime.consent.read("v2")).enabled).toBe(false);
    expect(request).toHaveBeenCalledWith(
      "cloud-backup-artwork:v1",
      { mode: "exclusive" },
      expect.any(Function),
    );
  });
  it("does not enable if persistent storage or lock support is unavailable", async () => {
    const write = vi.fn(async () => {
      throw new Error("storage unavailable");
    });
    const runtime = createArtworkBackupRuntime({
      read: async () => null,
      write,
      locks: undefined,
      requireFullPush: async () => {},
      newRemovalId: () => "r1",
    });
    expect(await runtime.consent.enable("v1", true)).toBe(false);
    expect(write).not.toHaveBeenCalled();
    const storageFailure = createArtworkBackupRuntime({
      read: async () => null,
      write,
      locks: {
        request: async (
          _name: string,
          _options: LockOptions,
          action: () => Promise<unknown>,
        ) => action(),
      } as never,
      requireFullPush: async () => {},
      newRemovalId: () => "r1",
    });
    expect(await storageFailure.consent.enable("v1", true)).toBe(false);
    expect(write).toHaveBeenCalledOnce();
  });
  it("allows ordinary backup without locks but fails closed for existing expanded consent", async () => {
    let stored: unknown;
    const runtime = createArtworkBackupRuntime({
      read: async () => stored,
      write: async () => {},
      locks: undefined,
      requireFullPush: async () => {},
      newRemovalId: () => "r1",
    });
    const upload = vi.fn(async () => "uploaded");
    await expect(
      runtime.scope.lock("cloud-backup-artwork:v1", upload),
    ).resolves.toBe("uploaded");
    stored = { enabled: true, remoteRemovalPending: false };
    await expect(
      runtime.scope.lock("cloud-backup-artwork:v1", upload),
    ).rejects.toThrow("lock unavailable");
    stored = { enabled: false, remoteRemovalPending: true, removalId: "r1" };
    await expect(
      runtime.scope.lock("cloud-backup-artwork:v1", upload),
    ).rejects.toThrow("lock unavailable");
    expect(upload).toHaveBeenCalledOnce();
  });
});
