import { beforeEach, describe, expect, it, vi } from "vitest";
import { vaultEventBus } from "./events";
import { SearchStore } from "./search-store.svelte";
import type { LocalEntity } from "./types";

const mocks = vi.hoisted(() => {
  const searchService = {
    index: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue([]),
  };

  return { searchService };
});

vi.mock("./service-registry", () => ({
  ServiceRegistry: class {
    async ensureInitialized() {
      return {
        search: mocks.searchService,
      };
    }
  },
}));

describe("SearchStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaultEventBus.reset(false);
    new SearchStore(
      new (class {
        async ensureInitialized() {
          return { search: mocks.searchService };
        }
      })() as any,
    );
  });

  it("indexes updated entities with derived keywords", async () => {
    const entity: LocalEntity = {
      id: "hero-1",
      title: "Hero One",
      content: "Body",
      lore: "Lore",
      type: "character",
      tags: ["tag-a", "tag-b"],
      labels: [],
      connections: [],
      metadata: { region: ["north"], rarity: ["rare"] },
      _path: ["world", "hero-1.md"],
    } as any;

    vaultEventBus.emit({
      type: "ENTITY_UPDATED",
      vaultId: "vault-1",
      entity,
      patch: { title: "Hero One" },
    });

    await vi.waitFor(() => {
      expect(mocks.searchService.index).toHaveBeenCalled();
    });

    expect(mocks.searchService.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "hero-1",
        title: "Hero One",
        content: "Body",
        lore: "Lore",
        type: "character",
        path: "world/hero-1.md",
        keywords: expect.stringContaining("tag-a"),
      }),
    );
  });

  it("rebuilds the index from cold sync chunks", async () => {
    const entities = {
      "hero-1": {
        id: "hero-1",
        title: "Hero One",
        content: "Body",
        lore: "Lore",
        type: "character",
        tags: ["tag-a"],
        labels: [],
        connections: [],
        metadata: {},
      } as LocalEntity,
      "hero-2": {
        id: "hero-2",
        title: "Hero Two",
        content: "Body",
        lore: "",
        type: "location",
        tags: [],
        labels: [],
        connections: [],
        metadata: {},
      } as LocalEntity,
    };

    vaultEventBus.emit({
      type: "SYNC_CHUNK_READY",
      vaultId: "vault-1",
      entities,
      newOrChangedIds: ["hero-1", "hero-2"],
    });

    await vi.waitFor(() => {
      expect(mocks.searchService.index).toHaveBeenCalledTimes(2);
    });
  });

  it("clears and re-indexes cached entities when the vault cache is loaded", async () => {
    const entities = {
      "hero-1": {
        id: "hero-1",
        title: "Hero One",
        content: "Body",
        lore: "Lore",
        type: "character",
        tags: ["tag-a"],
        labels: [],
        connections: [],
        metadata: {},
      } as LocalEntity,
      "hero-2": {
        id: "hero-2",
        title: "Hero Two",
        content: "Body",
        lore: "",
        type: "location",
        tags: [],
        labels: [],
        connections: [],
        metadata: {},
      } as LocalEntity,
    };

    vaultEventBus.emit({
      type: "CACHE_LOADED",
      vaultId: "vault-1",
      entities,
    });

    await vi.waitFor(() => {
      expect(mocks.searchService.clear).toHaveBeenCalled();
      expect(mocks.searchService.index).toHaveBeenCalledTimes(2);
    });
  });

  it("removes deleted entities from the index", async () => {
    vaultEventBus.emit({
      type: "ENTITY_DELETED",
      vaultId: "vault-1",
      entityId: "hero-1",
    });

    await vi.waitFor(() => {
      expect(mocks.searchService.remove).toHaveBeenCalledWith("hero-1");
    });
  });

  it("clears the search index when a vault opens", async () => {
    vaultEventBus.emit({
      type: "VAULT_OPENING",
      vaultId: "vault-1",
    });

    await vi.waitFor(() => {
      expect(mocks.searchService.clear).toHaveBeenCalled();
    });
  });
});
