// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SessionHubStore, SESSION_DRAFTS_KEY } from "./session-hub.svelte.js";

describe("SessionHubStore", () => {
  let store: SessionHubStore;

  beforeEach(() => {
    sessionStorage.clear();
    store = new SessionHubStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with empty state", () => {
    expect(store.entities).toEqual([]);
    expect(store.provenance).toEqual({});
    expect(store.nextOrder).toBe(1);
  });

  it("adds an entity and updates order", () => {
    const id = store.addEntity({
      type: "character",
      title: "Elara",
      content: "Brave hero",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    expect(id).toBeDefined();
    expect(store.entities).toHaveLength(1);
    expect(store.entities[0].id).toBe(id);
    expect(store.entities[0].title).toBe("Elara");
    expect(store.entities[0].createdOrder).toBe(1);
    expect(store.entities[0].selectedForSave).toBe(true);
    expect(store.nextOrder).toBe(2);
  });

  it("updates an entity", () => {
    const id = store.addEntity({
      type: "character",
      title: "Elara",
      content: "Brave hero",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    store.updateEntity(id, { title: "Elara the Brave", pinned: true });
    expect(store.entities[0].title).toBe("Elara the Brave");
    expect(store.entities[0].pinned).toBe(true);
  });

  it("removes an entity and its provenance", () => {
    const id = store.addEntity({
      type: "character",
      title: "Elara",
      content: "Brave hero",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    store.addProvenance({
      resultEntityId: id,
      usedEntityIds: [],
      offeredEntityIds: [],
      trimmed: false,
    });

    store.removeEntity(id);
    expect(store.entities).toHaveLength(0);
    expect(store.provenance[id]).toBeUndefined();
  });

  it("loads from sessionStorage", () => {
    const mockState = {
      version: 2,
      entities: [
        { id: "1", title: "Test", createdOrder: 1, reuseEnabled: true },
      ],
      provenance: {
        "1": {
          resultEntityId: "1",
          usedEntityIds: [],
          offeredEntityIds: [],
          trimmed: false,
        },
      },
      nextOrder: 2,
    };
    sessionStorage.setItem(SESSION_DRAFTS_KEY, JSON.stringify(mockState));

    const newStore = new SessionHubStore();
    expect(newStore.entities).toHaveLength(1);
    expect(newStore.entities[0].title).toBe("Test");
    expect(newStore.entities[0].selectedForSave).toBe(true);
    expect(newStore.provenance["1"]).toBeDefined();
    expect(newStore.nextOrder).toBe(2);
  });

  it("migrates from v1 SessionDraft format", () => {
    const oldFormat = [
      {
        type: "character",
        title: "Old Draft",
        content: "content",
        status: "draft",
      },
    ];
    sessionStorage.setItem(SESSION_DRAFTS_KEY, JSON.stringify(oldFormat));

    const newStore = new SessionHubStore();
    expect(newStore.entities).toHaveLength(1);
    expect(newStore.entities[0].title).toBe("Old Draft");
    expect(newStore.entities[0].id).toBeDefined();
    expect(newStore.entities[0].reuseEnabled).toBe(true);
    expect(newStore.entities[0].selectedForSave).toBe(true);
    expect(newStore.nextOrder).toBe(2);
  });

  it("clears all state", () => {
    store.addEntity({
      type: "character",
      title: "Elara",
      content: "Brave hero",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });
    store.clear();
    expect(store.entities).toHaveLength(0);
    expect(store.nextOrder).toBe(1);
  });
});
