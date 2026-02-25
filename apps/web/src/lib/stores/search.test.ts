import { describe, it, expect, beforeEach, vi } from "vitest";

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

vi.mock("$lib/services/search", () => ({
  searchService: {
    search: vi.fn().mockResolvedValue([]),
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
  },
}));

vi.mock("./ui.svelte", () => ({
  ui: {
    sharedMode: false,
  },
}));

describe("searchStore", () => {
  vi.setConfig({ testTimeout: 10000 });

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("loads valid recents from localStorage", async () => {
    const recents = [
      {
        id: "alpha",
        title: "Alpha",
        path: "alpha.md",
        score: 1,
        matchType: "title",
      },
      {
        id: "",
        title: "",
        path: "",
        score: 0,
        matchType: "content",
      },
    ];

    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(recents));

    const { searchStore } = await import("./search.svelte");
    searchStore.open();

    expect(searchStore.recents).toHaveLength(1);
    expect(searchStore.results).toHaveLength(1);
    expect(searchStore.results[0].id).toBe("alpha");
  });

  it("normalizes selected results missing IDs before saving recents", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);

    const { searchStore } = await import("./search.svelte");

    // Manual setup since results is raw state
    searchStore.isOpen = true;
    (searchStore as any).results = [
      {
        id: undefined,
        title: "Alpha",
        path: "alpha.md",
        score: 0.5,
        matchType: "title",
      } as any,
    ];
    searchStore.selectedIndex = 0;

    searchStore.selectCurrent();

    const [[, stored]] = vi.mocked(localStorage.setItem).mock.calls;
    const parsed = JSON.parse(stored as string);
    expect(parsed[0].id).toBe("alpha");
    expect(parsed[0].path).toBe("alpha.md");
  });

  it("uses vault-specific storage key", async () => {
    const { vault } = await import("./vault.svelte");
    // @ts-expect-error - activeVaultId is a state proxy
    vault.activeVaultId = "vault-a";

    const { searchStore } = await import("./search.svelte");
    searchStore.open();

    expect(localStorage.getItem).toHaveBeenCalledWith("search_recents_vault-a");
  });

  it("resets state on vault switch", async () => {
    const { searchStore } = await import("./search.svelte");
    searchStore.query = "previous search";
    searchStore.results = [{ id: "1" } as any];
    searchStore.selectedIndex = 5;
    searchStore.isLoading = true;
    searchStore.isOpen = true;

    searchStore.reset();

    expect(searchStore.query).toBe("");
    expect(searchStore.results).toEqual([]);
    expect(searchStore.selectedIndex).toBe(0);
    expect(searchStore.isLoading).toBe(false);
    expect(searchStore.isOpen).toBe(false);
    expect(localStorage.getItem).toHaveBeenCalled(); // Should reload recents
  });
});
