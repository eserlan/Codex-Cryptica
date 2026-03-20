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
    const newCat = {
      id: "test",
      label: "Test",
      color: "#ffffff",
      icon: "lucide:star",
    };
    categories.addCategory(newCat);
    expect(categories.list).toContainEqual(newCat);
  });

  it("should update an existing category", () => {
    categories.updateCategory("character", {
      label: "Modified Character",
      color: "#000000",
    });
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

  it("should initialize and merge stored categories with defaults", async () => {
    const stored = [
      { id: "custom", label: "Custom", color: "#ff0000", icon: "icon" },
    ];
    const { getDB } = await import("../utils/idb");
    const mockDB = await getDB();
    vi.mocked(mockDB.get).mockResolvedValueOnce(stored);

    await categories.init();

    expect(categories.isLoaded).toBe(true);
    expect(categories.getCategory("custom")).toEqual(stored[0]);
    // Ensure defaults are also there
    expect(categories.getCategory("character")).toBeDefined();
  });

  it("should handle initialization error", async () => {
    const { getDB } = await import("../utils/idb");
    const mockDB = await getDB();
    vi.mocked(mockDB.get).mockRejectedValueOnce(new Error("IDB Error"));

    await categories.init();
    expect(categories.isLoaded).toBe(true); // Should set even on error
  });

  it("should handle save error", async () => {
    const { getDB } = await import("../utils/idb");
    const mockDB = await getDB();
    vi.mocked(mockDB.put).mockRejectedValueOnce(new Error("Save Error"));

    // Should not throw
    await categories.save();
  });

  it("should update instead of duplicate if ID exists in addCategory", () => {
    const existingId = DEFAULT_CATEGORIES[0].id;
    const update = { ...DEFAULT_CATEGORIES[0], label: "Overwritten" };

    categories.addCategory(update);

    const result = categories.list.filter((c) => c.id === existingId);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Overwritten");
  });

  it("should not crash if updating non-existent category", () => {
    categories.updateCategory("non-existent", { label: "fail" });
    // Verify no changes to list length
    expect(categories.list).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it("should not init twice", async () => {
    categories.isLoaded = true;
    const { getDB } = await import("../utils/idb");
    const mockDB = await getDB();

    await categories.init();
    expect(mockDB.get).not.toHaveBeenCalled();
  });
});
