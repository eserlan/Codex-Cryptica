import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Svelte 5 $state
vi.stubGlobal("$state", {
  snapshot: vi.fn((x) => x),
});

vi.mock("../utils/entity-db", () => ({
  entityDb: {
    graphEntities: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
      first: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    entityContent: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    transaction: vi.fn().mockImplementation((_mode, _stores, task) => task()),
  },
}));

vi.mock("../stores/debug.svelte", () => ({
  debugStore: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { CacheService } from "./cache.svelte";
import { entityDb } from "../utils/entity-db";

describe("CacheService", () => {
  let service: CacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CacheService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("preloadVault", () => {
    it("should load entities into memory", async () => {
      const mockRecord = {
        vaultId: "v1",
        filePath: "f1.md",
        id: "e1",
        title: "E1",
        lastModified: 100,
      };
      vi.mocked(entityDb.graphEntities.toArray).mockResolvedValue([mockRecord]);

      await service.preloadVault("v1");

      const hit = await service.get("v1:f1.md");
      expect(hit?.entity.title).toBe("E1");
    });
  });

  describe("set", () => {
    it("should update in-memory cache if active", async () => {
      await service.preloadVault("v1");
      const entity = {
        id: "e1",
        title: "Cached",
        type: "npc",
        tags: [],
        labels: [],
        connections: [],
        content: "C",
        lore: "L",
      } as any;

      await service.set("v1:f1.md", 400, entity);

      const hit = await service.get("v1:f1.md");
      expect(hit).toBeDefined();
      expect(hit?.entity.title).toBe("Cached");
    });
  });

  describe("clearVault", () => {
    it("should delete all records for vault", async () => {
      await service.clearVault("v1");
      expect(entityDb.transaction).toHaveBeenCalled();
    });
  });

  describe("getEntityContent", () => {
    it("should load content from DB", async () => {
      vi.mocked(entityDb.entityContent.get).mockResolvedValue({
        content: "C",
        lore: "L",
      });
      const result = await service.getEntityContent("v1", "e1");
      expect(result).toEqual({ content: "C", lore: "L" });
    });
  });

  describe("isVaultContentEmpty", () => {
    it("should return true if count is 0", async () => {
      vi.mocked(entityDb.entityContent.count).mockResolvedValue(0);
      expect(await service.isVaultContentEmpty("v1")).toBe(true);
    });
  });
});
