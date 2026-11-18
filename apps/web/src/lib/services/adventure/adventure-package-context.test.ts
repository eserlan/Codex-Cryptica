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

  describe("verifyPin", () => {
    const stored = (overrides: Record<string, unknown> = {}) =>
      ({
        hash: packageRef.hash,
        path: "",
        package: referencePackage,
        originFormat: "adventure-json/v1",
        ...overrides,
      }) as any;

    it("is available for a matching package and fills the cache", async () => {
      const cache = new AdventurePackageContextCache(async () => stored());
      expect(await cache.verifyPin(session())).toEqual({
        status: "available",
      });
      expect(cache.peek(session())).toBe(referencePackage);
    });

    it("reads through the loader even when the package is cached", async () => {
      const loader = vi.fn(async () => stored());
      const cache = new AdventurePackageContextCache(loader);
      await cache.load(session());
      await cache.verifyPin(session());
      expect(loader).toHaveBeenCalledTimes(2);
    });

    it.each([
      ["missing", async () => null, "missing"],
      [
        "unreadable",
        async () => {
          throw new Error("corrupt");
        },
        "unreadable",
      ],
      [
        "hash mismatch",
        async () => stored({ hash: "c".repeat(64) }),
        "mismatch",
      ],
      [
        "id mismatch",
        async () => stored({ package: { ...referencePackage, id: "other" } }),
        "mismatch",
      ],
      [
        "version mismatch",
        async () =>
          stored({ package: { ...referencePackage, version: "9.9.9" } }),
        "mismatch",
      ],
    ])("is unavailable when %s", async (_name, loader, reason) => {
      const cache = new AdventurePackageContextCache(
        loader as any,
        async () => [],
      );
      expect(await cache.verifyPin(session())).toEqual({
        status: "unavailable",
        reason,
        otherVersionAvailable: false,
      });
    });

    it("evicts a cached copy after a failed check", async () => {
      const loader = vi
        .fn()
        .mockResolvedValueOnce(stored())
        .mockResolvedValue(null);
      const cache = new AdventurePackageContextCache(loader, async () => []);
      await cache.load(session());
      expect(cache.peek(session())).toBe(referencePackage);
      await cache.verifyPin(session());
      expect(cache.peek(session())).toBeUndefined();
    });

    it("reports another approved version of the same package id", async () => {
      const other = stored({
        hash: "d".repeat(64),
        package: { ...referencePackage, version: "2.0.0" },
      });
      const cache = new AdventurePackageContextCache(
        async () => null,
        async () => [other],
      );
      expect(await cache.verifyPin(session())).toMatchObject({
        otherVersionAvailable: true,
      });
    });

    it("ignores other ids and the pinned hash, and a failing listing", async () => {
      const unrelated = stored({
        hash: "d".repeat(64),
        package: { ...referencePackage, id: "unrelated" },
      });
      for (const listApproved of [
        async () => [unrelated],
        async () => [stored()],
        async () => {
          throw new Error("list");
        },
      ]) {
        const cache = new AdventurePackageContextCache(
          async () => null,
          listApproved,
        );
        expect(await cache.verifyPin(session())).toMatchObject({
          otherVersionAvailable: false,
        });
      }
    });
  });
});
