import { describe, it, expect, beforeEach, vi } from "vitest";

vi.hoisted(() => {
  (global as any).localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
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
  },
}));

vi.mock("./ui.svelte", () => ({
  ui: {
    sharedMode: false,
  },
}));

const getState = (store: {
  subscribe: (run: (value: any) => void) => () => void;
}) => {
  let value: any;
  const unsubscribe = store.subscribe((current: any) => {
    value = current;
  });
  unsubscribe();
  return value;
};

describe("searchStore", () => {
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

    const { searchStore } = await import("./search");
    searchStore.open();

    const state = getState(searchStore);
    expect(state.recents).toHaveLength(1);
    expect(state.results).toHaveLength(1);
    expect(state.results[0].id).toBe("alpha");
  });

  it("normalizes selected results missing IDs before saving recents", async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);

    const { searchStore } = await import("./search");
    searchStore.update((state: any) => ({
      ...state,
      results: [
        {
          id: undefined,
          title: "Alpha",
          path: "alpha.md",
          score: 0.5,
          matchType: "title",
        } as any,
      ],
      selectedIndex: 0,
    }));

    searchStore.selectCurrent();

    const [[, stored]] = vi.mocked(localStorage.setItem).mock.calls;
    const parsed = JSON.parse(stored as string);
    expect(parsed[0].id).toBe("alpha");
    expect(parsed[0].path).toBe("alpha.md");
  });
});
