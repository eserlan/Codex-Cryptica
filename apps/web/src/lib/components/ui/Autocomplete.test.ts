/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Autocomplete from "./Autocomplete.svelte";
import { searchService } from "@codex/search-orchestrator";
import { vault } from "$lib/stores/vault.svelte";

vi.mock("@codex/search-orchestrator", () => ({
  searchService: {
    search: vi.fn(),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    entities: {},
    defaultVisibility: "public",
  },
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    getCategory: vi.fn(() => ({ icon: "user" })),
    getColor: vi.fn(() => "#fff"),
  },
}));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: {
    sharedMode: false,
  },
}));

describe("Autocomplete", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders input with accessible attributes", () => {
    render(Autocomplete, {
      placeholder: "Find something...",
      ariaLabel: "Entity Search",
    });

    const input = screen.getByRole("combobox", { name: "Entity Search" });
    expect(input).toBeTruthy();
    expect(input.getAttribute("placeholder")).toBe("Find something...");
  });

  it("renders suggestions with type='button' when search results arrive", async () => {
    const mockEntities: Record<string, any> = {
      "e-1": { id: "e-1", title: "Goblin Scout", type: "npc" },
      "e-2": { id: "e-2", title: "Goblin Shaman", type: "npc" },
    };
    (vault as any).entities = mockEntities;

    (searchService.search as any).mockResolvedValue([
      { id: "e-1", title: "Goblin Scout", type: "npc" },
      { id: "e-2", title: "Goblin Shaman", type: "npc" },
    ]);

    render(Autocomplete, { minChars: 3, id: "test-auto" });

    const input = screen.getByRole("combobox");
    await fireEvent.input(input, { target: { value: "Goblin" } });

    // Advance debounce timer
    await vi.advanceTimersByTimeAsync(250);

    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(2);

    // Verify option elements are semantic buttons with explicit type="button"
    options.forEach((option) => {
      expect(option.tagName).toBe("BUTTON");
      expect(option.getAttribute("type")).toBe("button");
    });
  });

  it("does not query search if input length is below minChars (cancellation/negative path)", async () => {
    render(Autocomplete, { minChars: 3 });

    const input = screen.getByRole("combobox");
    await fireEvent.input(input, { target: { value: "Go" } });

    await vi.advanceTimersByTimeAsync(250);

    expect(searchService.search).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
