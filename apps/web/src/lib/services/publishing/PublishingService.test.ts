import { describe, it, expect, beforeEach, vi } from "vitest";
import { PublishingService, type PublishingServiceDeps } from "./PublishingService.svelte";


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
      getPublishRegistry: async (id) => registryStore[id],
      savePublishRegistry: async (reg) => { registryStore[reg.vaultId] = reg; },
      deletePublishRegistry: async (id) => { delete registryStore[id]; },
      listPublishRegistries: async () => Object.values(registryStore),
      vault: {
        activeVaultId: "vault-1",
        activeVaultRecord: { name: "Test Vault" },
        defaultVisibility: "visible",
        allEntities: [
          { id: "e1", title: "Public Note", status: "active", content: "Public" },
          { id: "e2", title: "Secret Note", status: "active", labels: ["hidden"], content: "Secret" },
        ],
        resolveImageUrl: vi.fn().mockResolvedValue("blob:uuid-1"),
      },
      mapRegistry: {
        allMaps: [
          { id: "map-1", name: "Public Map", playerVisible: true, assetPath: "maps/public.webp", pins: [] },
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
      "success"
    );
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

    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    await service.unpublish("vault-1");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://mock-proxy.local/api/published/snapshot-123",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(registryStore["vault-1"]).toBeUndefined();
    expect(service.publishedVaults["vault-1"]).toBeUndefined();
  });
});
