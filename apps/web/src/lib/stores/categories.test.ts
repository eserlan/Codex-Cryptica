import { describe, it, expect, vi, beforeEach } from "vitest";
import { CategoryStore, type ICategoryStorage } from "./categories.svelte";
import { DEFAULT_CATEGORIES } from "schema";

describe("CategoryStore", () => {
  let store: CategoryStore;
  let mockStorage: ICategoryStorage;

  beforeEach(() => {
    mockStorage = {
      load: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
    };
    store = new CategoryStore(mockStorage);
  });

  it("should initialize with default categories", () => {
    expect(store.list).toEqual(DEFAULT_CATEGORIES);
  });

  it("should add a new category", () => {
    const newCat = {
      id: "test",
      label: "Test",
      color: "#ffffff",
      icon: "lucide:star",
    };
    store.addCategory(newCat);
    expect(store.list).toContainEqual(newCat);
    expect(mockStorage.save).toHaveBeenCalled();
  });

  it("should update an existing category", () => {
    store.updateCategory("character", {
      label: "Modified Character",
      color: "#000000",
    });
    const updated = store.getCategory("character");
    expect(updated?.label).toBe("Modified Character");
    expect(updated?.color).toBe("#000000");
    expect(mockStorage.save).toHaveBeenCalled();
  });

  it("should remove a category", () => {
    store.removeCategory("character");
    expect(store.getCategory("character")).toBeUndefined();
    expect(mockStorage.save).toHaveBeenCalled();
  });

  it("should reset to defaults", () => {
    store.removeCategory("character");
    store.resetToDefaults();
    expect(store.list).toEqual(DEFAULT_CATEGORIES);
    expect(mockStorage.save).toHaveBeenCalled();
  });

  it("should initialize and merge stored categories with defaults", async () => {
    const stored = [
      { id: "custom", label: "Custom", color: "#ff0000", icon: "icon" },
    ];
    vi.mocked(mockStorage.load).mockResolvedValueOnce(stored);

    await store.init();

    expect(store.isLoaded).toBe(true);
    expect(store.getCategory("custom")).toEqual(stored[0]);
    // Ensure defaults are also there
    expect(store.getCategory("character")).toBeDefined();
  });

  it("should handle initialization error", async () => {
    vi.mocked(mockStorage.load).mockRejectedValueOnce(
      new Error("Storage Error"),
    );

    await store.init();
    expect(store.isLoaded).toBe(true); // Should set even on error
  });

  it("should handle save error", async () => {
    vi.mocked(mockStorage.save).mockRejectedValueOnce(new Error("Save Error"));

    // Should not throw
    await store.save();
  });

  it("should update instead of duplicate if ID exists in addCategory", () => {
    const existingId = DEFAULT_CATEGORIES[0].id;
    const update = { ...DEFAULT_CATEGORIES[0], label: "Overwritten" };

    store.addCategory(update);

    const result = store.list.filter((c) => c.id === existingId);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Overwritten");
  });

  it("should not crash if updating non-existent category", () => {
    store.updateCategory("non-existent", { label: "fail" });
    // Verify no changes to list length
    expect(store.list).toHaveLength(DEFAULT_CATEGORIES.length);
  });

  it("should not init twice", async () => {
    store.isLoaded = true;
    await store.init();
    expect(mockStorage.load).not.toHaveBeenCalled();
  });
});
