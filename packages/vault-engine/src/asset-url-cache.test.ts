import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetUrlCache } from "./asset-url-cache";

afterEach(() => vi.unstubAllGlobals());

describe("AssetUrlCache", () => {
  it("retains a published URL until its last consumer releases it", () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", { revokeObjectURL: revoke });
    const cache = new AssetUrlCache();
    expect(cache.publish("art", "blob:art")).toBe("blob:art");
    expect(cache.retain("art")).toBe("blob:art");
    cache.release("art");
    expect(revoke).not.toHaveBeenCalled();
    cache.release("art");
    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:art");
    expect(cache.has("art")).toBe(false);
  });

  it("revokes a redundant URL when another resolution wins the race", () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", { revokeObjectURL: revoke });
    const cache = new AssetUrlCache();
    expect(cache.reuse("art", "blob:first")).toBeUndefined();
    cache.publish("art", "blob:first");
    expect(cache.reuse("art", "blob:second")).toBe("blob:first");
    expect(revoke).toHaveBeenCalledWith("blob:second");
    cache.clear();
    expect(revoke).toHaveBeenCalledWith("blob:first");
    expect(cache.retain("art")).toBeUndefined();
    cache.release("missing");
    expect(cache.has("missing")).toBe(false);
  });
});
