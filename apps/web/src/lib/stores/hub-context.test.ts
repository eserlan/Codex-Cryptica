import { describe, it, expect, beforeEach } from "vitest";
import { HubContextStore } from "./hub-context.svelte";

describe("HubContextStore", () => {
  let store: HubContextStore;

  beforeEach(() => {
    store = new HubContextStore();
  });

  it("returns null initially", () => {
    expect(store.theme).toBeNull();
  });

  it("stores and retrieves a hub theme", () => {
    store.set("cyberpunk");
    expect(store.theme).toBe("cyberpunk");
  });

  it("can be reset to null", () => {
    store.set("fantasy");
    store.set(null);
    expect(store.theme).toBeNull();
  });

  it("overwrites previous theme", () => {
    store.set("fantasy");
    store.set("vampire");
    expect(store.theme).toBe("vampire");
  });
});
