import { describe, expect, it, vi } from "vitest";
import { runArtworkBackup } from "./cloud-backup-artwork-scope";
import { CloudBackupArtworkConsent } from "./cloud-backup-artwork-consent";

describe("adventure backup upload scope", () => {
  it("holds the shared lock through the upload and includes only accepted data", async () => {
    const events: string[] = [];
    const outcome = await runArtworkBackup("v1", {
      lock: async (_key, action) => {
        events.push("lock");
        const value = await action();
        events.push("unlock");
        return value;
      },
      readConsent: async () => ({ enabled: true, remoteRemovalPending: false }),
      upload: async (scope) => {
        events.push("upload");
        expect(scope).toEqual({ includeAdventures: true, forceFull: true });
        return { ok: true };
      },
      confirmRemoval: vi.fn(),
    });
    expect(outcome).toEqual({ ok: true });
    expect(events).toEqual(["lock", "upload", "unlock"]);
  });
  it("confirms revocation only after a successful full upload", async () => {
    const confirmRemoval = vi.fn(async () => true);
    const deps = {
      lock: async <T>(_key: string, action: () => Promise<T>) => action(),
      readConsent: async () => ({
        enabled: false as const,
        remoteRemovalPending: true as const,
        removalId: "r1",
      }),
      upload: vi.fn(async () => ({ ok: false })),
      confirmRemoval,
    };
    await runArtworkBackup("v1", deps);
    expect(confirmRemoval).not.toHaveBeenCalled();
    deps.upload.mockResolvedValueOnce({ ok: true });
    await runArtworkBackup("v1", deps);
    expect(deps.upload).toHaveBeenLastCalledWith({
      includeAdventures: false,
      forceFull: true,
    });
    expect(confirmRemoval).toHaveBeenCalledWith("v1", "r1");
  });
  it("fails closed if consent cannot be read or exclusion fails", async () => {
    const upload = vi.fn();
    const deps = {
      lock: async <T>(_key: string, action: () => Promise<T>) => action(),
      readConsent: async () => {
        throw new Error("storage");
      },
      upload,
      confirmRemoval: vi.fn(),
    };
    await expect(runArtworkBackup("v1", deps)).rejects.toThrow();
    expect(upload).not.toHaveBeenCalled();
  });
  it("serializes a revocation behind an already-started upload", async () => {
    let tail = Promise.resolve();
    const lock = async <T>(
      _key: string,
      action: () => Promise<T>,
    ): Promise<T> => {
      let release!: () => void;
      const previous = tail;
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await action();
      } finally {
        release();
      }
    };
    let stored: unknown = { enabled: true, remoteRemovalPending: false };
    const write = vi.fn(async (_vault: string, value: unknown) => {
      stored = value;
    });
    const consent = new CloudBackupArtworkConsent({
      read: async () => stored,
      write,
      requireFullPush: async () => {},
      lock,
      newRemovalId: () => "r1",
    });
    let finish!: () => void;
    let started!: () => void;
    const began = new Promise<void>((resolve) => {
      started = resolve;
    });
    const pending = runArtworkBackup("v1", {
      lock,
      readConsent: (vaultId) => consent.read(vaultId),
      confirmRemoval: (vaultId, id) => consent.confirmRemoval(vaultId, id),
      upload: async () => {
        started();
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        return { ok: true };
      },
    });
    await began;
    const disabling = consent.disable("v1");
    await Promise.resolve();
    expect(write).not.toHaveBeenCalled();
    finish();
    await pending;
    expect(await disabling).toBe(true);
    expect(await consent.read("v1")).toEqual({
      enabled: false,
      remoteRemovalPending: true,
      removalId: "r1",
    });
  });
});
