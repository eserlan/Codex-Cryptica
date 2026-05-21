import { beforeEach, describe, expect, it, vi } from "vitest";
import { vaultEventBus } from "./events.svelte";
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

describe("SearchStore", () => {
  let serviceRegistry: { ensureInitialized: ReturnType<typeof vi.fn> };
  let store: SearchStore;

  beforeEach(() => {
    vi.clearAllMocks();
    vaultEventBus.reset(false);
    serviceRegistry = {
      ensureInitialized: vi
        .fn()
        .mockResolvedValue({ search: mocks.searchService }),
    };
    store = new SearchStore(serviceRegistry as any);
  });

  it("indexes entities with derived search fields", async () => {
    const entity: LocalEntity = {
      id: "hero-1",
      title: "Hero One",
      content: "Body",
      lore: "Lore",
      type: "character",
      status: "active",
      tags: ["tag-a", "tag-b"],
      labels: [],
      aliases: ["The Hero", "Champion"],
      connections: [],
      metadata: { region: ["north"], rarity: ["rare"] },
      _path: ["world", "hero-1.md"],
    } as any;

    await (store as any).indexEntity(entity, { search: mocks.searchService });

    expect(mocks.searchService.index).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "hero-1",
        title: "Hero One",
        aliases: "The Hero Champion",
        content: "Body",
        lore: "Lore",
        type: "character",
        status: "active",
        path: "world/hero-1.md",
        keywords: "tag-a tag-b Lore north rare",
        updatedAt: expect.any(Number),
      }),
    );
  });

  it("falls back to an id-based path when entity paths are missing", async () => {
    const entity: LocalEntity = {
      id: "hero-2",
      title: "Hero Two",
      content: "",
      lore: "",
      type: "location",
      status: "draft",
      tags: [],
      labels: [],
      aliases: [],
      connections: [],
      metadata: {},
    } as any;

    await (store as any).indexEntity(entity, { search: mocks.searchService });

    expect(mocks.searchService.index).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "hero-2.md",
        keywords: "",
      }),
    );
  });

  it("removes entities from the index through the service registry", async () => {
    await (store as any).removeEntity("hero-3");

    expect(serviceRegistry.ensureInitialized).toHaveBeenCalledTimes(1);
    expect(mocks.searchService.remove).toHaveBeenCalledWith("hero-3");
  });

  it("does not subscribe to vault events because searchService owns indexing lifecycle", async () => {
    const entity: LocalEntity = {
      id: "hero-4",
      title: "Hero Four",
      content: "Body",
      lore: "",
      type: "character",
      status: "active",
      tags: [],
      labels: [],
      aliases: [],
      connections: [],
      metadata: {},
    } as any;

    vaultEventBus.emit({
      type: "ENTITY_UPDATED",
      vaultId: "vault-1",
      entity,
      patch: { title: "Hero Four" },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.searchService.index).not.toHaveBeenCalled();
    expect(mocks.searchService.remove).not.toHaveBeenCalled();
    expect(mocks.searchService.clear).not.toHaveBeenCalled();
  });
});
