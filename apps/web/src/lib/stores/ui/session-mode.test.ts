import { describe, it, expect } from "vitest";

// Stub $state before importing the store
(global as any).$state = (v: any) => v;

import { SessionModeStore } from "./session-mode.svelte";

describe("SessionModeStore", () => {
  it("initializes with default values", () => {
    const store = new SessionModeStore();

    expect(store.isStaging).toBe(false);
    expect(store.isDemoMode).toBe(false);
    expect(store.activeDemoTheme).toBeNull();
    expect(store.hasPromptedSave).toBe(false);
    expect(store.wasConverted).toBe(false);
    expect(store.sharedMode).toBe(false);
    expect(store.isGuestMode).toBe(false);
    expect(store.guestUsername).toBeNull();
  });

  it("updates guestUsername", () => {
    const store = new SessionModeStore();
    store.setGuestUsername("Alice");
    expect(store.guestUsername).toBe("Alice");
    store.setGuestUsername(null);
    expect(store.guestUsername).toBeNull();
  });
});
