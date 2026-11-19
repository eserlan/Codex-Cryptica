import { describe, expect, it, vi } from "vitest";
import type { StoredAdventurePackage } from "@codex/adventure-engine";
import type { AdventureArchiveEntry } from "#lib/services/adventure/adventure-session-repository.js";
import { AdventurePackageLibrary } from "./adventure-package-library.svelte.js";

function setup() {
  const env = { vaultId: "vault-1", ready: true, guest: false };
  const deps = {
    getVaultId: () => env.vaultId,
    isReady: () => env.ready,
    isGuest: () => env.guest,
    listPackages: vi.fn(async (): Promise<StoredAdventurePackage[]> => []),
    listSessions: vi.fn(async () => ({
      effectiveActiveId: null,
      entries: [] as AdventureArchiveEntry[],
    })),
    open: vi.fn(async () => {}),
    resumeArchived: vi.fn(async () => {}),
    removeApproved: vi.fn(async (_vaultId, hash, pinnedHashes) =>
      pinnedHashes.has(hash)
        ? {
            status: "refused" as const,
            hash,
            path: hash,
            reason: "pinned",
          }
        : { status: "removed" as const, hash, path: hash },
    ),
  };
  return { env, deps, library: new AdventurePackageLibrary(deps) };
}

const entry = (
  id: string,
  overrides: Partial<AdventureArchiveEntry> = {},
): AdventureArchiveEntry => ({
  id,
  title: id,
  status: "active",
  loadCondition: "normal",
  sourcePackage: {
    packageId: "mill",
    version: "1.0.0",
    formatVersion: "adventure-json/v1",
    hash: "a".repeat(64),
  },
  ...overrides,
});

describe("adventure package library", () => {
  it("groups normal sessions by package hash in repository order", async () => {
    const { deps, library } = setup();
    const first = entry("newer");
    const second = entry("older", { status: "archived" });
    deps.listSessions.mockResolvedValueOnce({
      effectiveActiveId: null,
      entries: [
        first,
        second,
        entry("unreadable", { loadCondition: "unreadable" }),
        entry("unbound", { sourcePackage: undefined }),
      ],
    });
    await library.refresh();
    expect(deps.listPackages).toHaveBeenCalledWith("vault-1");
    expect(library.pinnedByHash.get("a".repeat(64))).toEqual([first, second]);
  });

  it.each(["guest", "not-ready"])(
    "does not read packages in a %s Vault",
    async (mode) => {
      const { env, deps, library } = setup();
      env.guest = mode === "guest";
      env.ready = mode !== "not-ready";
      await library.refresh();
      expect(deps.listPackages).not.toHaveBeenCalled();
      expect(deps.listSessions).not.toHaveBeenCalled();
    },
  );

  it("does not restore old package pins after reset during a load", async () => {
    const { deps, library } = setup();
    let finish!: (value: {
      effectiveActiveId: null;
      entries: AdventureArchiveEntry[];
    }) => void;
    deps.listSessions.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const loading = library.refresh();
    library.reset();
    finish({ effectiveActiveId: null, entries: [entry("old")] });
    await loading;
    expect(library.pinnedByHash.size).toBe(0);
  });

  it("preserves the new Vault's pins when an earlier load fails", async () => {
    const { env, deps, library } = setup();
    let fail!: (error: Error) => void;
    deps.listPackages.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
    );
    const loading = library.refresh();
    env.vaultId = "vault-2";
    deps.listSessions.mockResolvedValueOnce({
      effectiveActiveId: null,
      entries: [entry("new")],
    });
    await library.refresh();
    fail(new Error("old storage failed"));
    await loading;
    expect(library.pinnedByHash.get("a".repeat(64))?.[0].id).toBe("new");
  });

  it("clears stale catalogue data when the current load fails", async () => {
    const { deps, library } = setup();
    deps.listSessions.mockResolvedValueOnce({
      effectiveActiveId: null,
      entries: [entry("old")],
    });
    await library.refresh();
    deps.listPackages.mockRejectedValueOnce(new Error("storage failed"));
    await library.refresh();
    expect(library.packages).toEqual([]);
    expect(library.pinnedByHash.size).toBe(0);
  });

  it("opens active sessions and resumes archived sessions", async () => {
    const { deps, library } = setup();
    await library.resume(entry("active"));
    await library.resume(entry("archived", { status: "archived" }));
    expect(deps.open).toHaveBeenCalledWith("vault-1", "active");
    expect(deps.resumeArchived).toHaveBeenCalledWith("vault-1", "archived");
  });

  it("prevents overlapping resumes and releases the guard after failure", async () => {
    const { deps, library } = setup();
    let fail!: (error: Error) => void;
    deps.open.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
    );
    const opening = library.resume(entry("first"));
    await library.resume(entry("second"));
    expect(deps.open).toHaveBeenCalledTimes(1);
    expect(library.resumingId).toBe("first");
    fail(new Error("session unavailable"));
    await opening;
    expect(library.resumingId).toBeNull();
    expect(library.resumeError).toBe("session unavailable");
    await library.resume(entry("second"));
    expect(library.resumeError).toBeNull();
  });
});
