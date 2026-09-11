/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import EntityTableSearch from "../EntityTableSearch.svelte";

const mockVault = vi.hoisted(() => {
  return {
    activeVaultId: "vault-1",
    allEntities: [
      {
        id: "e1",
        title: "Aldric",
        type: "npc",
        labels: ["Hero", "Village"],
        tags: [],
      },
      {
        id: "e2",
        title: "Brindlewood",
        type: "location",
        labels: ["Village", "Safehouse"],
        tags: [],
      },
      {
        id: "e3",
        title: "Dragon",
        type: "monster",
        labels: ["Boss", "Quest"],
        tags: [],
      },
      {
        id: "e4",
        title: "Old Relic",
        type: "item",
        labels: [],
        tags: ["Artifact"], // legacy tags fallback
      },
      {
        id: "e5",
        title: "Session 1",
        type: "note",
        labels: ["Session Logs", "village"], // mixed-case duplicate of Village
        tags: [],
      },
      {
        id: "e6",
        title: "Session 2",
        type: "note",
        labels: ["session logs"], // lowercase duplicate of Session Logs
        tags: [],
      },
    ],
  };
});

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: mockVault,
}));

describe("EntityTableSearch", () => {
  it("renders search input with placeholder and search icon", () => {
    render(EntityTableSearch, {
      props: {
        searchQuery: "",
        placeholder: "Search entities...",
      },
    });

    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.placeholder).toBe("Search entities...");
    expect(input.getAttribute("data-testid")).toBe("entity-table-search");
  });

  it("does not show autocomplete popup when typing normal text without # or @", async () => {
    render(EntityTableSearch, {
      props: {
        searchQuery: "",
      },
    });

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "dragon" } });
    await tick();

    expect(screen.queryByTestId("table-search-autocomplete")).toBeNull();
  });

  it("opens autocomplete with suggestions when typing # and deduplicates case variants", async () => {
    render(EntityTableSearch, {
      props: {
        searchQuery: "",
      },
    });

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "#" } });
    await tick();

    const dropdown = screen.getByTestId("table-search-autocomplete");
    expect(dropdown).not.toBeNull();

    const options = screen.getAllByTestId("table-search-autocomplete-option");
    // Unique deduplicated labels (case-insensitive): Artifact, Boss, Hero, Quest, Safehouse, Session Logs, Village
    expect(options.length).toBe(7);
    const textContents = options.map((o) =>
      o.textContent?.trim().toUpperCase(),
    );
    expect(textContents).toContain("#SESSION LOGS");
    expect(textContents).toContain("#VILLAGE");
    // Ensure no duplicate case entries exist
    const uniqueUpper = new Set(textContents);
    expect(uniqueUpper.size).toBe(7);
  });

  it("filters suggestions based on text following #", async () => {
    render(EntityTableSearch, {
      props: {
        searchQuery: "",
      },
    });

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "#vil" } });
    await tick();

    const options = screen.getAllByTestId("table-search-autocomplete-option");
    expect(options.length).toBe(1);
    expect(options[0].textContent?.trim()).toBe("#Village");
  });

  it("applies selected label to labelFilters and cleans query on click", async () => {
    let currentQuery = "";
    let currentFilters = new Set<string>();
    const onSearchChange = vi.fn((q: string) => {
      currentQuery = q;
    });
    const onLabelFilterChange = vi.fn((f: Set<string>) => {
      currentFilters = f;
    });

    render(EntityTableSearch, {
      props: {
        searchQuery: currentQuery,
        labelFilters: currentFilters,
        onSearchChange,
        onLabelFilterChange,
      },
    });

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "#vil" } });
    await tick();

    const option = screen.getByTestId("table-search-autocomplete-option");
    await fireEvent.click(option);
    await tick();

    expect(onLabelFilterChange).toHaveBeenCalled();
    expect(currentFilters.has("Village")).toBe(true);
    expect(onSearchChange).toHaveBeenCalledWith("");
    expect(screen.queryByTestId("table-search-autocomplete")).toBeNull();
  });

  it("preserves free-text query terms and applies label filter", async () => {
    let currentQuery = "ancient dragon #he";
    let currentFilters = new Set<string>();
    const onSearchChange = vi.fn((q: string) => {
      currentQuery = q;
    });
    const onLabelFilterChange = vi.fn((f: Set<string>) => {
      currentFilters = f;
    });

    render(EntityTableSearch, {
      props: {
        searchQuery: currentQuery,
        labelFilters: currentFilters,
        onSearchChange,
        onLabelFilterChange,
      },
    });

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "ancient dragon #he" } });
    await tick();

    const options = screen.getAllByTestId("table-search-autocomplete-option");
    expect(options.length).toBe(1);
    expect(options[0].textContent?.trim()).toBe("#Hero");

    await fireEvent.click(options[0]);
    await tick();

    expect(onLabelFilterChange).toHaveBeenCalled();
    expect(currentFilters.has("Hero")).toBe(true);
    expect(onSearchChange).toHaveBeenCalledWith("ancient dragon ");
  });

  it("supports @ prefix for label suggestions", async () => {
    let currentQuery = "";
    let currentFilters = new Set<string>();
    const onSearchChange = vi.fn((q: string) => {
      currentQuery = q;
    });
    const onLabelFilterChange = vi.fn((f: Set<string>) => {
      currentFilters = f;
    });

    render(EntityTableSearch, {
      props: {
        searchQuery: currentQuery,
        labelFilters: currentFilters,
        onSearchChange,
        onLabelFilterChange,
      },
    });

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "@que" } });
    await tick();

    const options = screen.getAllByTestId("table-search-autocomplete-option");
    expect(options.length).toBe(1);
    expect(options[0].textContent?.trim()).toBe("@Quest");

    await fireEvent.click(options[0]);
    await tick();

    expect(onLabelFilterChange).toHaveBeenCalled();
    expect(currentFilters.has("Quest")).toBe(true);
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("supports keyboard navigation with ArrowDown, ArrowUp, and Enter", async () => {
    let currentQuery = "";
    let currentFilters = new Set<string>();
    const onSearchChange = vi.fn((q: string) => {
      currentQuery = q;
    });
    const onLabelFilterChange = vi.fn((f: Set<string>) => {
      currentFilters = f;
    });

    render(EntityTableSearch, {
      props: {
        searchQuery: currentQuery,
        labelFilters: currentFilters,
        onSearchChange,
        onLabelFilterChange,
      },
    });

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "#" } });
    await tick();

    // ArrowDown to select first suggestion (Artifact)
    await fireEvent.keyDown(input, { key: "ArrowDown" });
    await tick();

    let options = screen.getAllByTestId("table-search-autocomplete-option");
    expect(options[0].getAttribute("aria-selected")).toBe("true");

    // ArrowDown to select second suggestion (Boss)
    await fireEvent.keyDown(input, { key: "ArrowDown" });
    await tick();

    options = screen.getAllByTestId("table-search-autocomplete-option");
    expect(options[1].getAttribute("aria-selected")).toBe("true");

    // ArrowUp back to first suggestion (Artifact)
    await fireEvent.keyDown(input, { key: "ArrowUp" });
    await tick();

    options = screen.getAllByTestId("table-search-autocomplete-option");
    expect(options[0].getAttribute("aria-selected")).toBe("true");

    // Press Enter to choose selected suggestion
    await fireEvent.keyDown(input, { key: "Enter" });
    await tick();

    expect(onLabelFilterChange).toHaveBeenCalled();
    expect(currentFilters.has("Artifact")).toBe(true);
    expect(onSearchChange).toHaveBeenCalledWith("");
    expect(screen.queryByTestId("table-search-autocomplete")).toBeNull();
  });

  it("supports Tab key to select the active or first suggestion", async () => {
    let currentQuery = "";
    let currentFilters = new Set<string>();
    const onSearchChange = vi.fn((q: string) => {
      currentQuery = q;
    });
    const onLabelFilterChange = vi.fn((f: Set<string>) => {
      currentFilters = f;
    });

    render(EntityTableSearch, {
      props: {
        searchQuery: currentQuery,
        labelFilters: currentFilters,
        onSearchChange,
        onLabelFilterChange,
      },
    });

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "#sa" } });
    await tick();

    // Tab without ArrowDown should select first matching suggestion (Safehouse)
    await fireEvent.keyDown(input, { key: "Tab" });
    await tick();

    expect(onLabelFilterChange).toHaveBeenCalled();
    expect(currentFilters.has("Safehouse")).toBe(true);
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("dismisses autocomplete on Escape", async () => {
    render(EntityTableSearch, {
      props: {
        searchQuery: "",
      },
    });

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "#" } });
    await tick();

    expect(screen.getByTestId("table-search-autocomplete")).not.toBeNull();

    await fireEvent.keyDown(input, { key: "Escape" });
    await tick();

    expect(screen.queryByTestId("table-search-autocomplete")).toBeNull();
  });

  it("clears search query when clear button is clicked", async () => {
    let currentQuery = "test search";
    const onSearchChange = vi.fn((q: string) => {
      currentQuery = q;
    });

    render(EntityTableSearch, {
      props: {
        searchQuery: currentQuery,
        onSearchChange,
      },
    });

    const clearBtn = screen.getByTestId("entity-table-search-clear");
    expect(clearBtn).not.toBeNull();

    await fireEvent.click(clearBtn);
    await tick();

    expect(onSearchChange).toHaveBeenCalledWith("");
  });
});
