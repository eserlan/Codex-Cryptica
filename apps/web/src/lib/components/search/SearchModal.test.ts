/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

const { mockSearchStore, mockUiStore, mockVault, mockCategories } = vi.hoisted(
  () => ({
    mockSearchStore: {
      isOpen: true,
      query: "",
      results: [],
      selectedIndex: 0,
      setQuery: vi.fn(),
      setSelectedIndex: vi.fn(),
      selectCurrent: vi.fn(),
      close: vi.fn(),
    },
    mockUiStore: {
      leftSidebarOpen: false,
    },
    mockVault: {
      selectedEntityId: null as string | null,
    },
    mockCategories: {
      getCategory: vi.fn(() => ({ icon: "lucide:file-text", label: "Note" })),
      getColor: vi.fn(() => "#888888"),
    },
  }),
);

vi.mock("$lib/stores/search.svelte", () => ({
  searchStore: mockSearchStore,
}));

vi.mock("$lib/stores/ui.svelte", () => ({
  uiStore: mockUiStore,
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
  page: {
    url: new URL("http://localhost/"),
  },
}));

vi.mock("./search-focus", () => ({
  DEFAULT_SEARCH_ENTITY_ZOOM: 2,
  dispatchSearchEntityFocus: vi.fn(),
  resolveSearchResultEntityId: vi.fn((result) => result.id),
}));

import SearchModal from "./SearchModal.svelte";

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
    mockUiStore.leftSidebarOpen = false;
    mockVault.selectedEntityId = null;
  });

  it("anchors to the main area when the left sidebar is open", () => {
    mockUiStore.leftSidebarOpen = true;

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
});
