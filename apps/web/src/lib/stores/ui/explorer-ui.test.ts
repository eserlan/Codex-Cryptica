import { describe, it, expect, vi } from "vitest";

// Stub $state before importing the store
(global as any).$state = (v: any) => v;

import { ExplorerUIStore } from "./explorer-ui.svelte";
import { UIPersistence } from "./persistence";

describe("ExplorerUIStore", () => {
  it("initializes with default values", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new ExplorerUIStore(persistence);

    expect(store.explorerViewMode).toBe("list");
    expect(store.explorerSortKey).toBe("name");
    expect(store.explorerSortDirection).toBe("asc");
    expect(store.labelFilters.size).toBe(0);
  });

  it("toggles label filters", () => {
    const store = new ExplorerUIStore();

    store.toggleLabelFilter("A");
    expect(Array.from(store.labelFilters)).toEqual(["A"]);

    store.toggleLabelFilter("B");
    expect(Array.from(store.labelFilters)).toEqual(["B"]); // Single select by default

    store.toggleLabelFilter("B");
    expect(store.labelFilters.size).toBe(0); // Toggle off

    store.toggleLabelFilter("X", true); // multi
    store.toggleLabelFilter("Y", true);
    expect(Array.from(store.labelFilters)).toEqual(["X", "Y"]);

    store.removeLabelFilter("X");
    expect(Array.from(store.labelFilters)).toEqual(["Y"]);

    store.clearLabelFilters();
    expect(store.labelFilters.size).toBe(0);
  });

  it("handles collapsed label groups", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new ExplorerUIStore(persistence);

    expect(Array.from(store.getCollapsedLabelGroups("v1"))).toEqual([]);

    store.toggleExplorerLabelGroup("v1", "G1");
    expect(Array.from(store.getCollapsedLabelGroups("v1"))).toEqual(["G1"]);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_explorer_collapsed_label_groups",
      expect.stringContaining("G1"),
    );

    store.toggleExplorerLabelGroup("v1", "G1");
    expect(Array.from(store.getCollapsedLabelGroups("v1"))).toEqual([]);
  });

  it("handles collapsed category groups independently from labels", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new ExplorerUIStore(persistence);

    store.toggleExplorerCategoryGroup("v1", "npc");
    store.toggleExplorerLabelGroup("v1", "npc");

    expect(Array.from(store.getCollapsedCategoryGroups("v1"))).toEqual(["npc"]);
    expect(Array.from(store.getCollapsedLabelGroups("v1"))).toEqual(["npc"]);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_explorer_collapsed_category_groups",
      expect.stringContaining("npc"),
    );

    store.toggleExplorerCategoryGroup("v1", "npc");

    expect(Array.from(store.getCollapsedCategoryGroups("v1"))).toEqual([]);
    expect(Array.from(store.getCollapsedLabelGroups("v1"))).toEqual(["npc"]);
  });

  it("persists category view mode", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new ExplorerUIStore(persistence);

    store.setExplorerViewMode("category");

    expect(store.explorerViewMode).toBe("category");
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_explorer_view_mode",
      "category",
    );
  });

  it("persists sort choice and uses a sensible default direction", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const store = new ExplorerUIStore(
      new UIPersistence({ storage: mockStorage }),
    );

    store.setExplorerSortKey("updated");

    expect(store.explorerSortKey).toBe("updated");
    expect(store.explorerSortDirection).toBe("desc");
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_explorer_sort_key",
      "updated",
    );
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_explorer_sort_direction",
      "desc",
    );

    store.toggleExplorerSortDirection();

    expect(store.explorerSortDirection).toBe("asc");
    expect(mockStorage.setItem).toHaveBeenLastCalledWith(
      "codex_explorer_sort_direction",
      "asc",
    );
  });

  it("restores a valid persisted sort preference", () => {
    const values: Record<string, string> = {
      codex_explorer_sort_key: "updated",
      codex_explorer_sort_direction: "asc",
    };
    const mockStorage = {
      getItem: vi.fn((key: string) => values[key] ?? null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    const store = new ExplorerUIStore(
      new UIPersistence({ storage: mockStorage }),
    );

    expect(store.explorerSortKey).toBe("updated");
    expect(store.explorerSortDirection).toBe("asc");
  });

  it("handles collapsed entity states", () => {
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new ExplorerUIStore(persistence);

    expect(Array.from(store.getCollapsedEntities("v1"))).toEqual([]);

    store.toggleExplorerEntityCollapse("v1", "e1");
    expect(Array.from(store.getCollapsedEntities("v1"))).toEqual(["e1"]);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_explorer_collapsed_entity_ids",
      expect.stringContaining("e1"),
    );

    store.toggleExplorerEntityCollapse("v1", "e1");
    expect(Array.from(store.getCollapsedEntities("v1"))).toEqual([]);
  });
});
