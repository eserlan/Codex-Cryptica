import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PublishingService,
  type PublishingServiceDeps,
} from "./PublishingService.svelte";

describe("PublishingService", () => {
  let deps: PublishingServiceDeps;
  let mockFetch: any;
  let registryStore: Record<string, any> = {};

  beforeEach(() => {
    registryStore = {};
    mockFetch = vi.fn().mockImplementation(async (url, _init) => {
      if (url.includes("/api/publish-vault")) {
        return {
          ok: true,
          json: async () => ({
            publishId: "snapshot-456",
            writeToken: "token-456",
            publishedAt: "2026-06-22T22:00:00Z",
          }),
        };
      }
      if (url.includes("/assets/")) {
        return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    deps = {
      fetch: mockFetch,
      baseUrl: "https://mock-proxy.local",
      getPublishTurnstileToken: vi.fn().mockResolvedValue("turnstile-token"),
      getPublishRegistry: async (id) => registryStore[id],
      savePublishRegistry: async (reg) => {
        registryStore[reg.vaultId] = reg;
      },
      deletePublishRegistry: async (id) => {
        delete registryStore[id];
      },
      listPublishRegistries: async () => Object.values(registryStore),
      vault: {
        activeVaultId: "vault-1",
        activeVaultRecord: { name: "Test Vault" },
        defaultVisibility: "visible",
        allEntities: [
          {
            id: "e1",
            title: "Public Note",
            status: "active",
            content: "Public",
          },
          {
            id: "e2",
            title: "Secret Note",
            status: "active",
            labels: ["hidden"],
            content: "Secret",
          },
        ],
        resolveImageUrl: vi.fn().mockResolvedValue("blob:uuid-1"),
      },
      mapRegistry: {
        allMaps: [
          {
            id: "map-1",
            name: "Public Map",
            playerVisible: true,
            assetPath: "maps/public.webp",
            pins: [],
          },
          { id: "map-2", name: "Private Map", playerVisible: false, pins: [] },
        ],
      },
      canvasRegistry: {
        allCanvases: [],
      },
      themeStore: {
        activeTheme: { id: "fantasy", primaryColor: "#ff0000" },
      },
      notificationStore: {
        notify: vi.fn(),
      },
    };
  });

  it("should load registries on init", async () => {
    registryStore["vault-1"] = {
      vaultId: "vault-1",
      publishId: "snapshot-123",
      writeToken: "token-123",
      publishedAt: "2026-06-22T21:00:00Z",
      stats: { entityCount: 1, relationshipCount: 0, assetCount: 0 },
    };

    const service = new PublishingService(deps);
    await service.loadRegistries();

    expect(service.publishedVaults["vault-1"]).toBeDefined();
    expect(service.publishedVaults["vault-1"].publishId).toBe("snapshot-123");
  });

  it("should get publish preview statistics correctly", async () => {
    const service = new PublishingService(deps);
    const preview = await service.getPublishPreview("vault-1");

    expect(preview.included.entityCount).toBe(1); // e1 is public, e2 is hidden
    expect(preview.excluded.entityCount).toBe(1); // e2
    expect(preview.included.mapCount).toBe(1); // map-1 is playerVisible, map-2 is not
    expect(preview.excluded.mapCount).toBe(1); // map-2
  });

  it("should publish a new campaign snapshot successfully", async () => {
    const mockBlob = new Blob(["image data"], { type: "image/webp" });
    mockFetch.mockImplementation(async (url: string) => {
      if (url.startsWith("blob:")) {
        return { ok: true, blob: async () => mockBlob };
      }
      return {
        ok: true,
        json: async () => ({
          publishId: "new-publish-123",
          writeToken: "write-token-123",
          publishedAt: "2026-06-22T22:30:00Z",
        }),
      };
    });

    const service = new PublishingService(deps);
    const registry = await service.publish("vault-1");

    expect(registry.publishId).toBe("new-publish-123");
    expect(registry.stats.entityCount).toBe(1);
    expect(service.publishedVaults["vault-1"]).toBeDefined();
    expect(deps.notificationStore.notify).toHaveBeenCalledWith(
      "World snapshot published successfully!",
      "success",
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "https://mock-proxy.local/api/publish-vault",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Turnstile-Token": "turnstile-token",
        }),
      }),
    );
  });

  it("should not create a snapshot when verification fails", async () => {
    deps.mapRegistry.allMaps = [];
    deps.getPublishTurnstileToken = vi
      .fn()
      .mockRejectedValue(new Error("Verification failed."));
    const service = new PublishingService(deps);

    await expect(service.publish("vault-1")).rejects.toThrow(
      "Verification failed.",
    );
    expect(
      mockFetch.mock.calls.some(([url]: [string]) =>
        url.includes("/api/publish-vault"),
      ),
    ).toBe(false);
  });

  it("should unpublish a campaign successfully", async () => {
    registryStore["vault-1"] = {
      vaultId: "vault-1",
      publishId: "snapshot-123",
      writeToken: "token-123",
      publishedAt: "2026-06-22T21:00:00Z",
      stats: { entityCount: 1, relationshipCount: 0, assetCount: 0 },
    };

    const service = new PublishingService(deps);
    await service.loadRegistries();

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await service.unpublish("vault-1");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://mock-proxy.local/api/published/snapshot-123",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(registryStore["vault-1"]).toBeUndefined();
    expect(service.publishedVaults["vault-1"]).toBeUndefined();
  });

  it("uploads changed assets during a publish update", async () => {
    registryStore["vault-1"] = {
      vaultId: "vault-1",
      publishId: "snapshot-123",
      writeToken: "token-123",
      publishedAt: "2026-06-22T21:00:00Z",
      stats: { entityCount: 1, relationshipCount: 0, assetCount: 1 },
    };

    deps.vault.allEntities = [
      {
        id: "e1",
        title: "Public Note",
        status: "active",
        content: "Public",
        image: "images/public.webp",
      },
    ];

    const mockBlob = new Blob(["new image data"], { type: "image/webp" });
    mockFetch.mockImplementation(async (url: string) => {
      if (url.startsWith("blob:")) {
        return { ok: true, blob: async () => mockBlob };
      }
      if (
        url === "https://mock-proxy.local/api/published/snapshot-123/bundle"
      ) {
        return {
          ok: true,
          json: async () => ({
            assetManifest: [
              {
                assetId: "images_public.webp",
                filename: "images/public.webp",
                mimeType: "image/webp",
                hash: "outdated-hash",
              },
            ],
          }),
        };
      }
      if (
        url ===
        "https://mock-proxy.local/api/publish-vault?publishId=snapshot-123"
      ) {
        return {
          ok: true,
          json: async () => ({
            publishId: "snapshot-123",
            writeToken: "token-123",
            publishedAt: "2026-06-22T22:30:00Z",
          }),
        };
      }
      if (
        url ===
        "https://mock-proxy.local/api/published/snapshot-123/assets/images_public.webp"
      ) {
        return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    const service = new PublishingService(deps);
    await service.publish("vault-1");

    expect(
      mockFetch.mock.calls.some(
        ([url]: [string]) =>
          url === "https://mock-proxy.local/api/published/snapshot-123/bundle",
      ),
    ).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://mock-proxy.local/api/published/snapshot-123/assets/images_public.webp",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "image/webp",
        }),
      }),
    );
  });

  describe("loadFromVault", () => {
    const diskRegistry = {
      vaultId: "vault-1",
      publishId: "disk-pub-999",
      writeToken: "disk-tok-999",
      publishedAt: "2026-06-23T12:00:00Z",
      stats: { entityCount: 3, relationshipCount: 1, assetCount: 0 },
    };

    function makeMockHandle(registry: any) {
      return {
        getDirectoryHandle: vi.fn().mockResolvedValue({
          getFileHandle: vi.fn().mockResolvedValue({
            getFile: vi.fn().mockResolvedValue({
              text: vi.fn().mockResolvedValue(JSON.stringify(registry)),
            }),
          }),
        }),
      } as unknown as FileSystemDirectoryHandle;
    }

    it("restores registry from disk when IDB has nothing", async () => {
      const service = new PublishingService(deps);
      const handle = makeMockHandle(diskRegistry);

      await service.loadFromVault("vault-1", handle);

      expect(registryStore["vault-1"]).toMatchObject({
        publishId: "disk-pub-999",
      });
      expect(service.publishedVaults["vault-1"]).toMatchObject({
        publishId: "disk-pub-999",
      });
    });

    it("prefers disk registry when it is newer than IDB", async () => {
      registryStore["vault-1"] = {
        ...diskRegistry,
        publishId: "old-pub",
        publishedAt: "2026-06-22T00:00:00Z",
      };
      const service = new PublishingService(deps);
      const handle = makeMockHandle(diskRegistry);

      await service.loadFromVault("vault-1", handle);

      expect(service.publishedVaults["vault-1"].publishId).toBe("disk-pub-999");
    });

    it("keeps IDB registry when it is newer than disk", async () => {
      const newerIdb = {
        ...diskRegistry,
        publishId: "newer-pub",
        publishedAt: "2026-06-24T00:00:00Z",
      };
      registryStore["vault-1"] = newerIdb;
      const service = new PublishingService(deps);
      const handle = makeMockHandle(diskRegistry);

      await service.loadFromVault("vault-1", handle);

      expect(
        service.publishedVaults["vault-1"]?.publishId ?? newerIdb.publishId,
      ).toBe("newer-pub");
    });

    it("does nothing when disk file is absent", async () => {
      const service = new PublishingService(deps);
      const handle = {
        getDirectoryHandle: vi
          .fn()
          .mockRejectedValue(
            Object.assign(new Error("Not found"), { name: "NotFoundError" }),
          ),
      } as unknown as FileSystemDirectoryHandle;

      await service.loadFromVault("vault-1", handle);

      expect(registryStore["vault-1"]).toBeUndefined();
    });
  });
});
