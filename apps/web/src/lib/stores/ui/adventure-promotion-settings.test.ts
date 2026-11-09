import { describe, it, expect, vi } from "vitest";

// Stub $state before importing the store
(global as any).$state = (v: any) => v;

import { AdventurePromotionSettings } from "./adventure-promotion-settings.svelte";
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

describe("AdventurePromotionSettings", () => {
  it("defaults autoPromote to false for new users", () => {
    const persistence = new UIPersistence({ storage: makeStorage() });
    const store = new AdventurePromotionSettings(persistence);

    expect(store.autoPromote).toBe(false);
  });

  it("initializes from persisted values", () => {
    const persistence = new UIPersistence({
      storage: makeStorage({
        codex_adventure_auto_promote: "true",
      }),
    });
    const store = new AdventurePromotionSettings(persistence);

    expect(store.autoPromote).toBe(true);
  });

  it("setAutoPromote updates state and persists", () => {
    const mockStorage = makeStorage();
    const persistence = new UIPersistence({ storage: mockStorage });
    const store = new AdventurePromotionSettings(persistence);

    store.setAutoPromote(true);
    expect(store.autoPromote).toBe(true);
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      "codex_adventure_auto_promote",
      "true",
    );
  });

  it("toggleAutoPromote flips the current value", () => {
    const persistence = new UIPersistence({ storage: makeStorage() });
    const store = new AdventurePromotionSettings(persistence);

    store.toggleAutoPromote();
    expect(store.autoPromote).toBe(true);
    store.toggleAutoPromote();
    expect(store.autoPromote).toBe(false);
  });
});
