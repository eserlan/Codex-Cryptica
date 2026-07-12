import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.hoisted(() => {
  (global as any).localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  // Mock Svelte 5 Runes
  (global as any).$state = (v: any) => v;
  (global as any).$state.raw = (v: any) => v;
});

vi.mock("@codex/search-orchestrator", () => ({
  searchService: {
    search: vi.fn().mockResolvedValue([]),
    getIndexProgress: vi.fn(() => ({
      status: "idle",
      vaultId: null,
      runId: null,
      indexedCount: 0,
      totalCount: null,
      isPartial: false,
      canRetry: false,
      message: "Search is idle.",
      error: null,
    })),
    subscribeIndexProgress: vi.fn((callback) => {
      callback({
        status: "idle",
        vaultId: null,
        runId: null,
        indexedCount: 0,
        totalCount: null,
        isPartial: false,
        canRetry: false,
        message: "Search is idle.",
        error: null,
      });
      return vi.fn();
    }),
    retryIndexing: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("schema", () => ({
  isEntityVisible: vi.fn().mockReturnValue(true),
}));

vi.mock("./vault.svelte", () => ({
  vault: {
    defaultVisibility: "public",
    entities: {},
    activeVaultId: "vault-1",
    isGuest: false,
  },
}));

vi.mock("./guest-vault.svelte", () => ({
  guestVault: {
    search: vi.fn().mockReturnValue([]),
  },
}));

vi.mock("./debug.svelte", () => ({
  debugStore: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { SearchStore } from "./search.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { guestVault } from "./guest-vault.svelte";

describe("SearchStore", () => {
  let store: SearchStore;
  let mockVault: any;
  let mockSearchService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { vault } = await import("./vault.svelte");
    const { searchService } = await import("@codex/search-orchestrator");

    mockVault = vault;
    sessionModeStore.sharedMode = false;
    mockSearchService = searchService;
    mockVault.isGuest = false;
    vi.mocked(guestVault.search).mockReset();
    vi.mocked(guestVault.search).mockReturnValue([]);

    store = new SearchStore(mockVault, sessionModeStore, mockSearchService);
  });

  afterEach(() => {
    store?.destroy();
  });

  it("loads valid recents from localStorage", () => {
    const recents = [
      {
        id: "alpha",
        title: "Alpha",
        path: "alpha.md",
        score: 1,
        matchType: "title",
      },
    ];

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(recents));

    // Need to re-instantiate to trigger loadRecents in constructor
    store?.destroy();
    store = new SearchStore(mockVault, sessionModeStore, mockSearchService);
    store.open();

    expect(store.recents).toHaveLength(1);
    expect(store.results).toHaveLength(1);
    expect(store.results[0].id).toBe("alpha");
  });

  it("handles malformed JSON in localStorage", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("invalid-json");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    store?.destroy();
    store = new SearchStore(mockVault, sessionModeStore, mockSearchService);

    expect(store.recents).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("handles non-array JSON in localStorage", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ not: "an array" }),
    );
    store?.destroy();
    store = new SearchStore(mockVault, sessionModeStore, mockSearchService);
    expect(store.recents).toEqual([]);
  });

  it("normalizes selected results missing IDs before saving recents", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);

    store.isOpen = true;
    store.results = [
      {
        id: undefined,
        title: "Alpha",
        path: "alpha.md",
        score: 0.5,
        matchType: "title",
      } as any,
    ];
    store.selectedIndex = 0;

    store.selectCurrent();

    const [[, stored]] = vi.mocked(localStorage.setItem).mock.calls;
    const parsed = JSON.parse(stored as string);
    expect(parsed[0].id).toBe("alpha");
    expect(parsed[0].path).toBe("alpha.md");
  });

  describe("normalizeRecent edge cases", () => {
    it("returns null if path is missing and id is missing", () => {
      const result = store.selectCurrent.call({
        results: [{ id: "", path: "" }],
        selectedIndex: 0,
        normalizeRecent: (store as any).normalizeRecent,
      });
      expect(result).toBeNull();
    });

    it("derives ID from path with subdirectories", () => {
      const entry = { id: "", path: "folder/subfolder/item.md" } as any;
      const normalized = (store as any).normalizeRecent(entry);
      expect(normalized.id).toBe("item");
    });

    it("returns null if derived ID is empty", () => {
      const entry = { id: "", path: ".md" } as any;
      const normalized = (store as any).normalizeRecent(entry);
      expect(normalized).toBeNull();
    });

    it("filters out nulls and invalid entries in loadRecents", () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify([
          { id: "valid", path: "valid.md" },
          { id: "", path: "" }, // normalized to null
          { id: "no-path", path: "" }, // filtered out by .filter(entry => entry.path)
        ]),
      );
      store?.destroy();
      store = new SearchStore(mockVault, sessionModeStore, mockSearchService);
      expect(store.recents).toHaveLength(1);
      expect(store.recents[0].id).toBe("valid");
    });
  });

  it("uses vault-specific storage key", () => {
    mockVault.activeVaultId = "vault-a";
    store.open();
    expect(localStorage.getItem).toHaveBeenCalledWith("search_recents_vault-a");
  });

  it("uses 'default' storage key if activeVaultId is missing", () => {
    mockVault.activeVaultId = undefined;
    store.open();
    expect(localStorage.getItem).toHaveBeenCalledWith("search_recents_default");
  });

  it("resets state", () => {
    store.query = "previous search";
    store.results = [{ id: "1" } as any];
    store.selectedIndex = 5;
    store.isLoading = true;
    store.isOpen = true;

    store.reset();

    expect(store.query).toBe("");
    expect(store.results).toEqual([]);
    expect(store.selectedIndex).toBe(0);
    expect(store.isLoading).toBe(false);
    expect(store.isOpen).toBe(false);
  });

  it("mirrors search indexing progress from the service", () => {
    const progress = {
      status: "partial",
      vaultId: "vault-1",
      runId: "run-1",
      indexedCount: 10,
      totalCount: 20,
      isPartial: true,
      canRetry: false,
      message: "Search is still indexing.",
      error: null,
    };

    mockSearchService.subscribeIndexProgress.mockImplementationOnce(
      (callback: any) => {
        callback(progress);
        return vi.fn();
      },
    );

    store?.destroy();
    store = new SearchStore(mockVault, sessionModeStore, mockSearchService);

    expect(store.indexProgress).toEqual(progress);
  });

  it("delegates retry indexing to the service", async () => {
    await store.retryIndexing();
    expect(mockSearchService.retryIndexing).toHaveBeenCalled();
  });

  it("responds to vault-switched event", () => {
    const resetSpy = vi.spyOn(store, "reset");
    window.dispatchEvent(new Event("vault-switched"));
    expect(resetSpy).toHaveBeenCalled();
  });

  it("toggles open/closed state", () => {
    expect(store.isOpen).toBe(false);
    store.toggle();
    expect(store.isOpen).toBe(true);
    store.toggle();
    expect(store.isOpen).toBe(false);
  });

  it("closes the store", () => {
    store.open();
    expect(store.isOpen).toBe(true);
    store.close();
    expect(store.isOpen).toBe(false);
  });

  describe("setQuery", () => {
    it("handles empty query by showing recents", async () => {
      store.recents = [{ id: "recent-1" } as any];
      await store.setQuery("");
      expect(store.results).toEqual(store.recents);
      expect(store.isLoading).toBe(false);
    });

    it("filters search results based on visibility", async () => {
      const rawResults = [{ id: "visible-1" }, { id: "hidden-1" }] as any;

      mockSearchService.search.mockResolvedValue(rawResults);
      mockVault.entities = {
        "visible-1": { id: "visible-1", visibility: "public" },
        "hidden-1": { id: "hidden-1", visibility: "private" },
      };

      const { isEntityVisible } = await import("schema");
      vi.mocked(isEntityVisible).mockImplementation(
        (entity: any) => entity.visibility === "public",
      );

      await store.setQuery("test");

      expect(store.results).toHaveLength(1);
      expect(store.results[0].id).toBe("visible-1");
      expect(store.isLoading).toBe(false);
    });

    it("uses the guest snapshot search fallback in guest mode", async () => {
      mockVault.isGuest = true;
      vi.mocked(guestVault.search).mockReturnValue([
        {
          id: "guest-1",
          title: "Guest Result",
          path: "guest-1.md",
          score: 1,
          matchType: "title",
        },
      ] as any);
      mockVault.entities = {
        "guest-1": { id: "guest-1", visibility: "public" },
      };

      await store.setQuery("guest");

      expect(guestVault.search).toHaveBeenCalledWith("guest", 20);
      expect(mockSearchService.search).not.toHaveBeenCalled();
      expect(store.results).toEqual([
        {
          id: "guest-1",
          title: "Guest Result",
          path: "guest-1.md",
          score: 1,
          matchType: "title",
        },
      ]);
    });

    it("still filters guest fallback results by visibility", async () => {
      mockVault.isGuest = true;
      vi.mocked(guestVault.search).mockReturnValue([
        { id: "visible-1", path: "visible-1.md", score: 1, matchType: "title" },
        {
          id: "hidden-1",
          path: "hidden-1.md",
          score: 0.6,
          matchType: "content",
        },
      ] as any);
      mockVault.entities = {
        "visible-1": { id: "visible-1", visibility: "public" },
        "hidden-1": { id: "hidden-1", visibility: "private" },
      };

      const { isEntityVisible } = await import("schema");
      vi.mocked(isEntityVisible).mockImplementation(
        (entity: any) => entity.visibility === "public",
      );

      await store.setQuery("guest");

      expect(store.results).toEqual([
        { id: "visible-1", path: "visible-1.md", score: 1, matchType: "title" },
      ]);
    });

    it("keeps visibility filtering while search results are partial", async () => {
      store.indexProgress = {
        status: "partial",
        vaultId: "vault-1",
        runId: "run-1",
        indexedCount: 1,
        totalCount: 2,
        isPartial: true,
        canRetry: false,
        message: "Search is still indexing.",
        error: null,
      };
      const rawResults = [{ id: "visible-1" }, { id: "private-1" }] as any;
      mockSearchService.search.mockResolvedValue(rawResults);
      mockVault.entities = {
        "visible-1": { id: "visible-1", visibility: "public" },
        "private-1": { id: "private-1", visibility: "private" },
      };

      const { isEntityVisible } = await import("schema");
      vi.mocked(isEntityVisible).mockImplementation(
        (entity: any) => entity.visibility === "public",
      );

      await store.setQuery("partial");

      expect(store.results).toEqual([{ id: "visible-1" }]);
    });

    it("handles results where entity is not found in vault", async () => {
      mockSearchService.search.mockResolvedValue([{ id: "missing" }] as any);
      mockVault.entities = {};

      await store.setQuery("test");

      expect(store.results).toHaveLength(0);
    });

    it("handles search service errors", async () => {
      mockSearchService.search.mockRejectedValue(new Error("Network error"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await store.setQuery("test");

      expect(store.results).toEqual([]);
      expect(store.isLoading).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("includes drafts in search service options", async () => {
      await store.setQuery("draft query");
      expect(mockSearchService.search).toHaveBeenCalledWith(
        "draft query",
        expect.objectContaining({ includeDrafts: true }),
      );
    });
  });

  describe("setSelectedIndex", () => {
    it("does nothing if no results", () => {
      store.results = [];
      store.setSelectedIndex(1);
      expect(store.selectedIndex).toBe(0);
    });

    it("sets index within bounds", () => {
      store.results = [{ id: "1" }, { id: "2" }] as any;
      store.setSelectedIndex(1);
      expect(store.selectedIndex).toBe(1);
    });

    it("wraps around when index is too large", () => {
      store.results = [{ id: "1" }, { id: "2" }] as any;
      store.setSelectedIndex(2);
      expect(store.selectedIndex).toBe(0);
    });

    it("wraps around when index is negative", () => {
      store.results = [{ id: "1" }, { id: "2" }] as any;
      store.setSelectedIndex(-1);
      expect(store.selectedIndex).toBe(1);
    });
  });

  describe("selectCurrent", () => {
    it("returns null if no results", () => {
      store.results = [];
      expect(store.selectCurrent()).toBeNull();
    });

    it("returns null if normalization fails", () => {
      store.results = [{ id: "", path: "" }] as any;
      expect(store.selectCurrent()).toBeNull();
    });

    it("adds selected result to recents and saves to localStorage", () => {
      const result = { id: "1", title: "One", path: "one.md" } as any;
      store.results = [result];
      store.selectedIndex = 0;

      const returned = store.selectCurrent();

      expect(returned).toStrictEqual(result);
      expect(store.recents[0].id).toBe("1");
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it("limits recents to 5 items", () => {
      store.recents = [
        { id: "1", path: "1.md" },
        { id: "2", path: "2.md" },
        { id: "3", path: "3.md" },
        { id: "4", path: "4.md" },
        { id: "5", path: "5.md" },
      ] as any;
      store.results = [{ id: "6", path: "6.md" }] as any;
      store.selectedIndex = 0;

      store.selectCurrent();
      expect(store.recents).toHaveLength(5);
      expect(store.recents[0].id).toBe("6");
      expect(store.recents[4].id).toBe("4");
    });
  });
});
