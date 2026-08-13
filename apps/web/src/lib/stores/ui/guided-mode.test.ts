import { describe, it, expect, vi } from "vitest";

// Stub $state before importing the store
(global as any).$state = (v: any) => v;

import { GuidedModeStore } from "./guided-mode.svelte";
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

describe("GuidedModeStore", () => {
  it("defaults isGuidedMode to true for new users", () => {
    const persistence = new UIPersistence({ storage: makeStorage() });
    const store = new GuidedModeStore(persistence);

    expect(store.isGuidedMode).toBe(true);
    expect(store.dismissedRecommendationIds).toEqual([]);
  });

  it("initializes from persisted values", () => {
    const persistence = new UIPersistence({
      storage: makeStorage({
        codex_guided_mode_active: "false",
        codex_guided_mode_dismissed_recommendations: JSON.stringify(["r1"]),
      }),
    });
    const store = new GuidedModeStore(persistence);

    expect(store.isGuidedMode).toBe(false);
    expect(store.dismissedRecommendationIds).toEqual(["r1"]);
  });

  it("setGuidedMode updates state and persists <100ms synchronously", () => {
    const mockStorage = makeStorage();
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new GuidedModeStore(persistence);

    store.setGuidedMode(false);
    expect(store.isGuidedMode).toBe(false);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_guided_mode_active",
      "false",
    );
  });

  it("toggleGuidedMode flips the current value", () => {
    const persistence = new UIPersistence({ storage: makeStorage() });
    const store = new GuidedModeStore(persistence);

    store.toggleGuidedMode();
    expect(store.isGuidedMode).toBe(false);
    store.toggleGuidedMode();
    expect(store.isGuidedMode).toBe(true);
  });

  it("dismissRecommendation adds and persists an id without duplicates", () => {
    const mockStorage = makeStorage();
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new GuidedModeStore(persistence);

    store.dismissRecommendation("rec-1");
    store.dismissRecommendation("rec-1");
    expect(store.dismissedRecommendationIds).toEqual(["rec-1"]);
    expect(store.isRecommendationDismissed("rec-1")).toBe(true);
    expect(store.isRecommendationDismissed("rec-2")).toBe(false);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_guided_mode_dismissed_recommendations",
      JSON.stringify(["rec-1"]),
    );
  });
});
