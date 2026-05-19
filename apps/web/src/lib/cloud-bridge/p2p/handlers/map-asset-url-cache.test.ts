import { describe, it, expect, vi, beforeEach } from "vitest";
import { MapAssetUrlCache } from "./map-asset-url-cache";

describe("MapAssetUrlCache", () => {
  let createSpy: ReturnType<typeof vi.fn>;
  let revokeSpy: ReturnType<typeof vi.fn>;
  let counter: number;

  beforeEach(() => {
    counter = 0;
    createSpy = vi.fn(() => `blob:url-${++counter}`);
    revokeSpy = vi.fn();
    vi.stubGlobal("URL", {
      createObjectURL: createSpy,
      revokeObjectURL: revokeSpy,
    } as any);
  });

  it("revokes previous map URL when a new one is set", () => {
    const cache = new MapAssetUrlCache();
    const u1 = cache.setAsset(new Blob(["a"]));
    const u2 = cache.setAsset(new Blob(["b"]));
    expect(u1).toBe("blob:url-1");
    expect(u2).toBe("blob:url-2");
    expect(revokeSpy).toHaveBeenCalledWith("blob:url-1");
    expect(revokeSpy).toHaveBeenCalledTimes(1);
  });

  it("revokes previous fog URL when a new one is set", () => {
    const cache = new MapAssetUrlCache();
    cache.setFog(new Blob(["a"]));
    cache.setFog(new Blob(["b"]));
    expect(revokeSpy).toHaveBeenCalledWith("blob:url-1");
  });

  it("revokeAll releases both slots", () => {
    const cache = new MapAssetUrlCache();
    cache.setAsset(new Blob(["a"]));
    cache.setFog(new Blob(["b"]));
    revokeSpy.mockClear();

    cache.revokeAll();

    expect(revokeSpy).toHaveBeenCalledWith("blob:url-1");
    expect(revokeSpy).toHaveBeenCalledWith("blob:url-2");
    expect(revokeSpy).toHaveBeenCalledTimes(2);
  });

  it("revokeAll is idempotent", () => {
    const cache = new MapAssetUrlCache();
    cache.revokeAll();
    cache.revokeAll();
    expect(revokeSpy).not.toHaveBeenCalled();
  });
});
