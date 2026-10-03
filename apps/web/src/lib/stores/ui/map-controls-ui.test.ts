import { describe, expect, it } from "vitest";
import { MapControlsUIStore } from "./map-controls-ui.svelte";

describe("MapControlsUIStore", () => {
  it("starts closed so the map stays visible on phones", () => {
    expect(new MapControlsUIStore().open).toBe(false);
  });

  it("toggles open and closed", () => {
    const store = new MapControlsUIStore();
    store.toggle();
    expect(store.open).toBe(true);
    store.toggle();
    expect(store.open).toBe(false);
  });

  it("close is a no-op when already closed and closes when open", () => {
    const store = new MapControlsUIStore();
    store.close();
    expect(store.open).toBe(false);
    store.toggle();
    store.close();
    expect(store.open).toBe(false);
  });
});
