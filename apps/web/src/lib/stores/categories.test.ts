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
    categories.updateCategory("character", { label: "Modified Character", color: "#000000" });
    const updated = categories.getCategory("character");
    expect(updated?.label).toBe("Modified Character");
    expect(updated?.color).toBe("#000000");
  });

  it("should remove a category", () => {
    categories.removeCategory("character");
    expect(categories.getCategory("character")).toBeUndefined();
  });

  it("should reset to defaults", () => {
    categories.removeCategory("character");
    categories.resetToDefaults();
    expect(categories.list).toEqual(DEFAULT_CATEGORIES);
  });

  it("should return fallback color for unknown category", () => {
    expect(categories.getColor("non-existent")).toBe("#15803d");
  });
});
