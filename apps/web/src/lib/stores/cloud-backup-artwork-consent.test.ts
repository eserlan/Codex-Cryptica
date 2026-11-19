import { describe, expect, it, vi } from "vitest";
import { CloudBackupArtworkConsent } from "./cloud-backup-artwork-consent";

function harness() {
  let stored: unknown;
  const write = vi.fn(async (_vault: string, value: unknown) => {
    stored = value;
  });
  const full = vi.fn(async () => {});
  const service = new CloudBackupArtworkConsent({
    read: async () => stored,
    write,
    requireFullPush: full,
    lock: async (_key, action) => action(),
    newRemovalId: () => "removal-1",
  });
  return { service, write, full, stored: () => stored };
}
describe("expanded adventure backup consent", () => {
  it("defaults old and absent settings to off and needs an explicit decision", async () => {
    const h = harness();
    expect(await h.service.read("v1")).toEqual({
      enabled: false,
      remoteRemovalPending: false,
    });
    expect(await h.service.enable("v1", false)).toBe(false);
    expect(h.write).not.toHaveBeenCalled();
  });
  it("marks a full push before storing an accepted opt-in", async () => {
    const h = harness();
    expect(await h.service.enable("v1", true)).toBe(true);
    expect(h.full).toHaveBeenCalledWith("v1");
    expect(await h.service.read("v1")).toEqual({
      enabled: true,
      remoteRemovalPending: false,
    });
    expect(h.full.mock.invocationCallOrder[0]).toBeLessThan(
      h.write.mock.invocationCallOrder[0],
    );
  });
  it("turns off locally before a failed removal request and retains retry state", async () => {
    const h = harness();
    await h.service.enable("v1", true);
    h.full.mockRejectedValueOnce(new Error("offline"));
    expect(await h.service.disable("v1")).toBe(false);
    expect(await h.service.read("v1")).toEqual({
      enabled: false,
      remoteRemovalPending: true,
      removalId: "removal-1",
    });
    expect(await h.service.retryRemoval("v1")).toBe(true);
    expect(await h.service.read("v1")).toEqual({
      enabled: false,
      remoteRemovalPending: true,
      removalId: "removal-1",
    });
    expect(await h.service.confirmRemoval("v1", "stale")).toBe(false);
    expect(await h.service.enable("v1", true)).toBe(false);
    await h.service.confirmRemoval("v1", "removal-1");
    expect(await h.service.read("v1")).toEqual({
      enabled: false,
      remoteRemovalPending: false,
    });
  });
  it("never enables when the full-push marker cannot be persisted", async () => {
    const h = harness();
    h.full.mockRejectedValueOnce(new Error("storage failure"));
    expect(await h.service.enable("v1", true)).toBe(false);
    expect(h.stored()).toBeUndefined();
  });
  it("fails closed on malformed stored consent or unavailable exclusion", async () => {
    const write = vi.fn();
    const malformed = new CloudBackupArtworkConsent({
      read: async () => ({ enabled: true }),
      write,
      requireFullPush: vi.fn(),
      lock: async (_key, action) => action(),
      newRemovalId: () => "id",
    });
    await expect(malformed.read("v1")).rejects.toThrow();
    expect(await malformed.enable("v1", true)).toBe(false);
    const noLock = new CloudBackupArtworkConsent({
      read: async () => null,
      write,
      requireFullPush: vi.fn(),
      lock: async () => {
        throw new Error("unavailable");
      },
      newRemovalId: () => "id",
    });
    expect(await noLock.enable("v1", true)).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });
});
