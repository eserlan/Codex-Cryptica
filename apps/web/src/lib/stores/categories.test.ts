import { describe, it, expect, vi, beforeEach } from "vitest";
import { categories } from "./categories.svelte";
import { DEFAULT_CATEGORIES } from "schema";

// Mock IndexedDB
vi.mock("../utils/idb", () => ({
  getDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
  }),
}));

describe("CategoryStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categories.list = [...DEFAULT_CATEGORIES];
    categories.isLoaded = false;
  });

  it("should initialize with default categories", () => {
    expect(categories.list).toEqual(DEFAULT_CATEGORIES);
  });

  it("should add a new category", () => {
    const newCat = { id: "test", label: "Test", color: "#ffffff", icon: "lucide:star" };
    categories.addCategory(newCat);
    expect(categories.list).toContainEqual(newCat);
  });

  it("should update an existing category", () => {
    categories.updateCategory("npc", { label: "Modified NPC", color: "#000000" });
    const updated = categories.getCategory("npc");
    expect(updated?.label).toBe("Modified NPC");
    expect(updated?.color).toBe("#000000");
  });

  it("should remove a category", () => {
    categories.removeCategory("npc");
    expect(categories.getCategory("npc")).toBeUndefined();
  });

  it("should reset to defaults", () => {
    categories.removeCategory("npc");
    categories.resetToDefaults();
    expect(categories.list).toEqual(DEFAULT_CATEGORIES);
  });

  it("should return fallback color for unknown category", () => {
    expect(categories.getColor("non-existent")).toBe("#15803d");
  });
});
