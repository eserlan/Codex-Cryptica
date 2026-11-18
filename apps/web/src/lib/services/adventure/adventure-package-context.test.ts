import { describe, expect, it, vi } from "vitest";
import { AdventurePackageContextCache } from "./adventure-package-context";
import {
  packageRef,
  referencePackage,
} from "#lib/stores/oracle/tests/adventure-fixtures.js";

const session = (id = "session-1") =>
  ({ id, vaultId: "vault-1", sourcePackage: packageRef }) as any;

describe("AdventurePackageContextCache", () => {
  it("loads once per session and serves the cached copy afterwards", async () => {
    const loader = vi.fn(async () => ({ package: referencePackage }) as any);
    const cache = new AdventurePackageContextCache(loader);
    expect(cache.peek(session())).toBeUndefined();
    const first = await cache.load(session());
    const second = await cache.load(session());
    expect(second).toBe(first);
    expect(loader).toHaveBeenCalledOnce();
    expect(loader).toHaveBeenCalledWith("vault-1", packageRef.hash);
    expect(cache.peek(session())).toBe(first);
    expect(cache.peek(session("session-2"))).toBeUndefined();
  });

  it("rejects without caching when the package is missing or the load throws", async () => {
    const loader = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("disk"))
      .mockResolvedValue({ package: referencePackage });
    const cache = new AdventurePackageContextCache(loader);
    await expect(cache.load(session())).rejects.toThrow(
      "adventure-package-unavailable",
    );
    await expect(cache.load(session())).rejects.toThrow(
      "adventure-package-unavailable",
    );
    expect(cache.peek(session())).toBeUndefined();
    await expect(cache.load(session())).resolves.toBe(referencePackage);
    expect(loader).toHaveBeenCalledTimes(3);
  });

  it("evicts least-recently-used sessions when the cache reaches its bound", async () => {
    const loader = vi.fn(async () => ({ package: referencePackage }) as any);
    const cache = new AdventurePackageContextCache(loader);
    for (let i = 1; i <= 5; i++) await cache.load(session(`session-${i}`));
    cache.peek(session("session-1"));
    await cache.load(session("session-6"));
    expect(cache.peek(session("session-1"))).toBe(referencePackage);
    expect(cache.peek(session("session-2"))).toBeUndefined();
    expect(cache.peek(session("session-6"))).toBe(referencePackage);
  });
});
