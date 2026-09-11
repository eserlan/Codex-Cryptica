import { describe, it, expect, vi } from "vitest";

// Stub $state before importing the store
(global as any).$state = (v: any) => v;

import { TileDeckPanelUIStore } from "./tile-deck-panel-ui.svelte";
import { UIPersistence } from "./persistence";

function makeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
}

describe("TileDeckPanelUIStore", () => {
  it("defaults the starter-deck catalog to collapsed and grids to hidden", () => {
    const persistence = new UIPersistence({ storage: makeStorage() });
    const store = new TileDeckPanelUIStore(persistence);

    expect(store.catalogCollapsed).toBe(true);
    expect(store.isGridExpanded("deck-1")).toBe(false);
  });

  it("toggles and persists the catalog collapsed state", () => {
    const storage = makeStorage();
    const store = new TileDeckPanelUIStore(new UIPersistence({ storage }));

    store.toggleCatalog();
    expect(store.catalogCollapsed).toBe(false);
    expect(storage.setItem).toHaveBeenCalledWith(
      "codex_tile_deck_catalog_collapsed",
      "false",
    );

    // A fresh store reading the same storage picks up the persisted value.
    const restored = new TileDeckPanelUIStore(new UIPersistence({ storage }));
    expect(restored.catalogCollapsed).toBe(false);
  });

  it("toggles a deck's grid independently of other decks and persists it", () => {
    const storage = makeStorage();
    const store = new TileDeckPanelUIStore(new UIPersistence({ storage }));

    store.toggleGrid("deck-1");
    expect(store.isGridExpanded("deck-1")).toBe(true);
    expect(store.isGridExpanded("deck-2")).toBe(false);

    const restored = new TileDeckPanelUIStore(new UIPersistence({ storage }));
    expect(restored.isGridExpanded("deck-1")).toBe(true);
    expect(restored.isGridExpanded("deck-2")).toBe(false);

    store.toggleGrid("deck-1");
    expect(store.isGridExpanded("deck-1")).toBe(false);
  });
});
