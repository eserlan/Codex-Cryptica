import { describe, expect, it, beforeEach } from "vitest";
import { GeneratorFavoritesStore } from "./generator-favorites.svelte";
import { UIPersistence, UI_STORAGE_KEYS } from "./persistence";

class MemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe("GeneratorFavoritesStore", () => {
  let storage: MemoryStorage;
  let persistence: UIPersistence;

  beforeEach(() => {
    storage = new MemoryStorage();
    persistence = new UIPersistence({ storage });
  });

  it("initializes with empty favorites when storage is clean", () => {
    const store = new GeneratorFavoritesStore(persistence);
    expect(store.favoriteIds).toEqual([]);
    expect(store.isFavorite("npc")).toBe(false);
  });

  it("loads valid favorite generator IDs from storage", () => {
    storage.setItem(
      UI_STORAGE_KEYS.FAVOURITE_GENERATOR_IDS,
      JSON.stringify(["npc", "dungeon", "invalid-id-that-does-not-exist"]),
    );

    const store = new GeneratorFavoritesStore(persistence);
    expect(store.favoriteIds).toEqual(["npc", "dungeon"]);
    expect(store.isFavorite("npc")).toBe(true);
    expect(store.isFavorite("dungeon")).toBe(true);
    expect(store.isFavorite("settlement")).toBe(false);
  });

  it("handles corrupted storage data gracefully", () => {
    storage.setItem(
      UI_STORAGE_KEYS.FAVOURITE_GENERATOR_IDS,
      "not-a-valid-json{",
    );

    const store = new GeneratorFavoritesStore(persistence);
    expect(store.favoriteIds).toEqual([]);
  });

  it("adds, removes, and toggles favorite status and persists changes", () => {
    const store = new GeneratorFavoritesStore(persistence);

    // Toggle on
    store.toggleFavorite("faction");
    expect(store.isFavorite("faction")).toBe(true);
    expect(store.favoriteIds).toEqual(["faction"]);
    expect(
      JSON.parse(storage.getItem(UI_STORAGE_KEYS.FAVOURITE_GENERATOR_IDS)!),
    ).toEqual(["faction"]);

    // Add another
    store.addFavorite("settlement");
    expect(store.favoriteIds).toEqual(["faction", "settlement"]);

    // Adding duplicate does nothing
    store.addFavorite("faction");
    expect(store.favoriteIds).toEqual(["faction", "settlement"]);

    // Toggle off
    store.toggleFavorite("faction");
    expect(store.isFavorite("faction")).toBe(false);
    expect(store.favoriteIds).toEqual(["settlement"]);
    expect(
      JSON.parse(storage.getItem(UI_STORAGE_KEYS.FAVOURITE_GENERATOR_IDS)!),
    ).toEqual(["settlement"]);

    // Remove remaining
    store.removeFavorite("settlement");
    expect(store.isFavorite("settlement")).toBe(false);
    expect(store.favoriteIds).toEqual([]);

    // Removing non-existent does nothing
    store.removeFavorite("settlement");
    expect(store.favoriteIds).toEqual([]);
  });

  it("rejects invalid generator IDs from being added", () => {
    const store = new GeneratorFavoritesStore(persistence);
    store.addFavorite("fake-gen" as any);
    expect(store.favoriteIds).toEqual([]);
  });
});
