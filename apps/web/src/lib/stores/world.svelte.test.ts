import { describe, expect, it, vi } from "vitest";
import { WorldStore } from "./world.svelte";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("WorldStore", () => {
  it("ignores stale load results when a newer vault load finishes first", async () => {
    const firstMetadata = deferred<any>();
    const firstFrontPage = deferred<any>();
    const firstRecent = deferred<any>();
    const secondMetadata = deferred<any>();
    const secondFrontPage = deferred<any>();
    const secondRecent = deferred<any>();

    const store = new WorldStore(
      {
        getMetadata: vi.fn((vaultId: string) =>
          vaultId === "vault-1"
            ? firstMetadata.promise
            : secondMetadata.promise,
        ),
        getFrontPageEntity: vi.fn((vaultId: string) =>
          vaultId === "vault-1"
            ? firstFrontPage.promise
            : secondFrontPage.promise,
        ),
        getRecentActivity: vi.fn((vaultId: string) =>
          vaultId === "vault-1" ? firstRecent.promise : secondRecent.promise,
        ),
        updateMetadata: vi.fn(),
        generateCampaignDescription: vi.fn(),
        generateCoverImage: vi.fn(),
      } as any,
      {
        getRecentActivity: vi.fn((vaultId: string) =>
          vaultId === "vault-1" ? firstRecent.promise : secondRecent.promise,
        ),
      } as any,
    );

    const firstLoad = store.load("vault-1", 6);
    const secondLoad = store.load("vault-2", 6);

    secondMetadata.resolve({
      id: "vault-2",
      name: "Vault Two",
    });
    secondFrontPage.resolve(null);
    secondRecent.resolve([]);
    await secondLoad;

    expect(store.metadata?.id).toBe("vault-2");
    expect(store.activeVaultId).toBe("vault-2");

    firstMetadata.resolve({
      id: "vault-1",
      name: "Vault One",
    });
    firstFrontPage.resolve(null);
    firstRecent.resolve([]);
    await firstLoad;

    expect(store.metadata?.id).toBe("vault-2");
    expect(store.activeVaultId).toBe("vault-2");
  });

  it("clears the previous vault content immediately when switching vaults", async () => {
    const firstMetadata = deferred<any>();
    const firstFrontPage = deferred<any>();
    const firstRecent = deferred<any>();
    const secondMetadata = deferred<any>();
    const secondFrontPage = deferred<any>();
    const secondRecent = deferred<any>();

    const store = new WorldStore(
      {
        getMetadata: vi.fn((vaultId: string) =>
          vaultId === "vault-1"
            ? firstMetadata.promise
            : secondMetadata.promise,
        ),
        getFrontPageEntity: vi.fn((vaultId: string) =>
          vaultId === "vault-1"
            ? firstFrontPage.promise
            : secondFrontPage.promise,
        ),
        getRecentActivity: vi.fn((vaultId: string) =>
          vaultId === "vault-1" ? firstRecent.promise : secondRecent.promise,
        ),
        updateMetadata: vi.fn(),
        generateCampaignDescription: vi.fn(),
        generateCoverImage: vi.fn(),
      } as any,
      {
        getRecentActivity: vi.fn((vaultId: string) =>
          vaultId === "vault-1" ? firstRecent.promise : secondRecent.promise,
        ),
      } as any,
    );

    const firstLoad = store.load("vault-1", 6);
    firstMetadata.resolve({
      id: "vault-1",
      name: "Vault One",
      description: "First vault",
    });
    firstFrontPage.resolve({ id: "front-1", content: "First front page" });
    firstRecent.resolve([
      { id: "entity-1", title: "First", lastModified: 1 } as any,
    ]);
    await firstLoad;

    expect(store.metadata?.id).toBe("vault-1");
    expect(store.frontPageEntity?.id).toBe("front-1");
    expect(store.recentActivity).toHaveLength(1);

    const secondLoad = store.load("vault-2", 6);

    expect(store.activeVaultId).toBe("vault-2");
    expect(store.isLoading).toBe(true);
    expect(store.metadata).toBeNull();
    expect(store.frontPageEntity).toBeNull();
    expect(store.recentActivity).toEqual([]);

    secondMetadata.resolve({
      id: "vault-2",
      name: "Vault Two",
      description: "Second vault",
    });
    secondFrontPage.resolve({
      id: "front-2",
      content: "Second front page",
    });
    secondRecent.resolve([
      { id: "entity-2", title: "Second", lastModified: 2 } as any,
    ]);
    await secondLoad;

    expect(store.metadata?.id).toBe("vault-2");
    expect(store.frontPageEntity?.id).toBe("front-2");
    expect(store.recentActivity).toHaveLength(1);
    expect(store.isLoading).toBe(false);
  });
});
