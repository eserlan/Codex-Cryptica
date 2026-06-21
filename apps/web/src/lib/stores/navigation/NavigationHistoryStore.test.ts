import { describe, it, expect, beforeEach } from "vitest";
import { NavigationHistoryStore } from "./NavigationHistoryStore.svelte";

describe("NavigationHistoryStore", () => {
  let store: NavigationHistoryStore;

  beforeEach(() => {
    store = new NavigationHistoryStore();
  });

  it("should be created", () => {
    expect(store).toBeTruthy();
  });

  it("should push entities and prevent consecutive duplicates", () => {
    store.push("entity-1");
    store.push("entity-1"); // Duplicate
    store.push("entity-2");

    expect(store.past).toEqual(["entity-1", "entity-2"]);
    expect(store.future).toEqual([]);
  });

  it("should truncate future stack on new push", () => {
    store.push("entity-1");
    store.push("entity-2");
    store.back(); // past: [entity-1], future: [entity-2]

    store.push("entity-3"); // past: [entity-1, entity-3], future: []

    expect(store.past).toEqual(["entity-1", "entity-3"]);
    expect(store.future).toEqual([]);
  });

  it("should navigate back and forward", () => {
    store.push("entity-1");
    store.push("entity-2");
    store.push("entity-3");

    const back1 = store.back((_id) => true);
    expect(back1).toBe("entity-2");
    expect(store.past).toEqual(["entity-1", "entity-2"]);
    expect(store.future).toEqual(["entity-3"]);

    const back2 = store.back((_id) => true);
    expect(back2).toBe("entity-1");

    const back3 = store.back((_id) => true);
    expect(back3).toBeNull(); // Cannot go back further

    const forward1 = store.forward((_id) => true);
    expect(forward1).toBe("entity-2");

    const forward2 = store.forward((_id) => true);
    expect(forward2).toBe("entity-3");

    const forward3 = store.forward((_id) => true);
    expect(forward3).toBeNull(); // Cannot go forward further
  });

  it("should skip missing entities when navigating back and forward", () => {
    store.push("entity-1");
    store.push("entity-missing");
    store.push("entity-3");

    // Entity missing is not valid
    const isValid = (id: string) => id !== "entity-missing";

    const back1 = store.back(isValid);
    expect(back1).toBe("entity-1");
    expect(store.past).toEqual(["entity-1"]);
    expect(store.future).toEqual(["entity-3", "entity-missing"]); // The missing one is put into future stack so we can skip it on forward too

    const forward1 = store.forward(isValid);
    expect(forward1).toBe("entity-3");
    expect(store.past).toEqual(["entity-1", "entity-missing", "entity-3"]);
  });

  it("should enforce maxSize limit", () => {
    store.maxSize = 3;

    store.push("entity-1");
    store.push("entity-2");
    store.push("entity-3");
    store.push("entity-4"); // Shifts out entity-1

    expect(store.past).toEqual(["entity-2", "entity-3", "entity-4"]);
  });
});
