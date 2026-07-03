/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockSearchStore,
  mockVault,
  mockCategories,
  mockPage,
  mockModalUIStore,
} = vi.hoisted(() => ({
  mockSearchStore: {
    isOpen: true,
    query: "",
    results: [],
    selectedIndex: 0,
    setQuery: vi.fn(),
    setSelectedIndex: vi.fn(),
    selectCurrent: vi.fn(),
    close: vi.fn(),
    retryIndexing: vi.fn(),
    indexProgress: {
      status: "idle",
      vaultId: null,
      runId: null,
      indexedCount: 0,
      totalCount: null,
      isPartial: false,
      canRetry: false,
      message: "Search is idle.",
      error: null,
    },
  } as any,
  mockVault: {
    selectedEntityId: null as string | null,
  },
  mockCategories: {
    getCategory: vi.fn(() => ({ icon: "lucide:file-text", label: "Note" })),
    getColor: vi.fn(() => "#888888"),
  },
  mockPage: {
    url: new URL("http://localhost/"),
  },
  mockModalUIStore: {
    openZenMode: vi.fn(),
  },
}));

vi.mock("$lib/stores/search.svelte", () => ({
  searchStore: mockSearchStore,
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: mockVault,
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: mockCategories,
}));

vi.mock("$lib/utils/icon", () => ({
  getIconClass: vi.fn(() => "icon-[lucide--file-text]"),
}));

vi.mock("$lib/utils/markdown", () => ({
  renderMarkdown: vi.fn((value: string) => value),
}));

vi.mock("$app/state", () => ({
  page: mockPage,
}));

vi.mock("./search-focus", () => ({
  DEFAULT_SEARCH_ENTITY_ZOOM: 2,
  dispatchSearchEntityFocus: vi.fn(),
  resolveSearchResultEntityId: vi.fn((result) => result.id),
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: mockModalUIStore,
}));

import SearchModal from "./SearchModal.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";

describe("SearchModal", () => {
  beforeEach(() => {
    mockSearchStore.isOpen = true;
    mockSearchStore.query = "";
    mockSearchStore.results = [];
    mockSearchStore.selectedIndex = 0;
    mockSearchStore.setQuery.mockReset();
    mockSearchStore.setSelectedIndex.mockReset();
    mockSearchStore.selectCurrent.mockReset();
    mockSearchStore.close.mockReset();
    mockSearchStore.retryIndexing.mockReset();
    mockSearchStore.indexProgress = {
      status: "idle",
      vaultId: null,
      runId: null,
      indexedCount: 0,
      totalCount: null,
      isPartial: false,
      canRetry: false,
      message: "Search is idle.",
      error: null,
    };
    layoutUIStore.leftSidebarOpen = false;
    mockVault.selectedEntityId = null;
    mockPage.url = new URL("http://localhost/");
    mockModalUIStore.openZenMode.mockReset();
  });

  it("anchors to the main area when the left sidebar is open", () => {
    layoutUIStore.leftSidebarOpen = true;

    const { container } = render(SearchModal);

    const modal = screen.getByTestId("search-modal");
    expect(modal.getAttribute("data-layout")).toBe("main");
    expect(modal.className).toContain("md:left-96");
    expect(modal.className).toContain("z-[95]");
    expect(modal.className).toContain("justify-center");
    expect(modal.className).toContain("pt-[12vh]");
    expect(container.querySelector(".rounded-lg")).toBeTruthy();
  });

  it("keeps clear of the entity detail panel when it is open", () => {
    mockVault.selectedEntityId = "entity-1";

    render(SearchModal);

    const modal = screen.getByTestId("search-modal");
    expect(modal.getAttribute("data-layout")).toBe("main");
    expect(modal.className).toContain("md:right-[400px]");
    expect(modal.className).toContain("lg:right-[450px]");
  });

  it("uses the global centered layout when no sidebar is open", () => {
    render(SearchModal);

    const modal = screen.getByTestId("search-modal");
    expect(modal.getAttribute("data-layout")).toBe("global");
    expect(modal.className).toContain("md:left-0");
    expect(modal.className).toContain("md:right-0");
    expect(modal.className).toContain("justify-center");
  });

  it("shows partial indexing progress counts", () => {
    mockSearchStore.indexProgress = {
      status: "partial",
      vaultId: "vault-1",
      runId: "run-1",
      indexedCount: 42,
      totalCount: 100,
      isPartial: true,
      canRetry: false,
      message: "Search is still indexing.",
      error: null,
    };

    render(SearchModal);

    const progress = screen.getByTestId("search-index-progress");
    expect(progress.textContent).toContain("Search is still indexing.");
    expect(progress.textContent).toContain("42/100");
  });

  it("shows retry action when indexing failed", () => {
    mockSearchStore.indexProgress = {
      status: "failed",
      vaultId: "vault-1",
      runId: "run-1",
      indexedCount: 20,
      totalCount: 100,
      isPartial: true,
      canRetry: true,
      message: "Search may be incomplete. Retry indexing.",
      error: "worker failed",
    };

    render(SearchModal);

    expect(screen.getByRole("button", { name: "Retry indexing" })).toBeTruthy();
  });

  it("opens zen mode for table selections triggered by Enter", async () => {
    mockPage.url = new URL("http://localhost/table");
    mockSearchStore.query = "ald";
    mockSearchStore.results = [
      {
        id: "entity-1",
        title: "Aldric",
        path: "characters/aldric",
        score: 10,
        matchType: "title",
        type: "character",
      },
    ];
    mockSearchStore.selectCurrent.mockReturnValue(mockSearchStore.results[0]);

    render(SearchModal);

    await fireEvent.keyDown(screen.getByTestId("search-modal-input"), {
      key: "Enter",
    });

    expect(mockVault.selectedEntityId).toBe("entity-1");
    expect(mockModalUIStore.openZenMode).toHaveBeenCalledWith("entity-1");
    expect(mockSearchStore.close).toHaveBeenCalled();
  });
});
