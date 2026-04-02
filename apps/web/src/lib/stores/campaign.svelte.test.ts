import { describe, expect, it, vi } from "vitest";
import { CampaignStore } from "./campaign.svelte";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("CampaignStore", () => {
  it("ignores stale load results when a newer vault load finishes first", async () => {
    const firstMetadata = deferred<any>();
    const firstFrontPage = deferred<any>();
    const firstRecent = deferred<any>();
    const secondMetadata = deferred<any>();
    const secondFrontPage = deferred<any>();
    const secondRecent = deferred<any>();

    const store = new CampaignStore(
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
        getRecentActivity: vi.fn(),
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
});
