import { describe, it, expect, beforeEach } from "vitest";
import { GuestVaultStore } from "./guest-vault.svelte";

describe("GuestVaultStore", () => {
  let store: GuestVaultStore;

  const mockBundle = {
    publishId: "snapshot-123",
    vaultTitle: "My Campaign",
    publishedAt: "2026-06-22T22:00:00Z",
    entities: [
      { id: "e1", title: "Public Place", content: "A cool town.", labels: ["village"] },
      { id: "e2", title: "Public Character", content: "An ally.", aliases: ["Bob"] },
    ],
    relationships: [
      { id: "r1", sourceId: "e1", targetId: "e2", label: "home" }
    ],
    maps: [
      { id: "map-1", name: "World Map", playerVisible: true, assetPath: "images/world.webp" }
    ],
    canvases: [],
    assetManifest: [
      { assetId: "images_world_webp", filename: "images/world.webp", mimeType: "image/webp", hash: "hash123" }
    ],
    activeTheme: { id: "fantasy", primaryColor: "#ff0000" }
  };

  beforeEach(() => {
    store = new GuestVaultStore();
  });

  it("should initialize with default states", () => {
    expect(store.isInitialized).toBe(false);
    expect(store.publishId).toBeNull();
    expect(store.vaultTitle).toBe("Guest Vault");
    expect(store.entities).toEqual([]);
  });

  it("should load bundle details and structures correctly", async () => {
    await store.loadBundle(mockBundle);

    expect(store.isInitialized).toBe(true);
    expect(store.publishId).toBe("snapshot-123");
    expect(store.vaultTitle).toBe("My Campaign");
    expect(store.entities).toHaveLength(2);
    expect(store.relationships).toHaveLength(1);
    expect(store.maps).toHaveLength(1);
    expect(store.activeTheme).toEqual({ id: "fantasy", primaryColor: "#ff0000" });
  });

  it("should build search results and perform client-side searches", async () => {
    await store.loadBundle(mockBundle);

    // Empty query returns all entities
    store.searchQuery = "";
    expect(store.searchResults).toHaveLength(2);

    // Search by title
    store.searchQuery = "Place";
    expect(store.searchResults).toHaveLength(1);
    expect(store.searchResults[0].id).toBe("e1");

    // Search by content keyword
    store.searchQuery = "ally";
    expect(store.searchResults).toHaveLength(1);
    expect(store.searchResults[0].id).toBe("e2");

    // Search by alias
    store.searchQuery = "Bob";
    expect(store.searchResults).toHaveLength(1);
    expect(store.searchResults[0].id).toBe("e2");

    // Search by label
    store.searchQuery = "village";
    expect(store.searchResults).toHaveLength(1);
    expect(store.searchResults[0].id).toBe("e1");
  });

  it("should resolve local paths to proxy asset URLs based on manifest mapping", async () => {
    await store.loadBundle(mockBundle);

    // Existing asset in manifest
    const url1 = store.resolveImageUrl("images/world.webp");
    expect(url1).toBe("https://oracle-proxy.espen-erlandsen.workers.dev/api/published/snapshot-123/assets/images_world_webp");

    // Non-existing asset returns empty string
    const url2 = store.resolveImageUrl("images/non-existing.webp");
    expect(url2).toBe("");

    // External URLs and data/blob URIs are passed through unchanged
    const extUrl = "https://google.com/pic.png";
    expect(store.resolveImageUrl(extUrl)).toBe(extUrl);
  });

  it("should clear the store back to defaults on clear()", async () => {
    await store.loadBundle(mockBundle);
    store.clear();

    expect(store.isInitialized).toBe(false);
    expect(store.publishId).toBeNull();
    expect(store.entities).toEqual([]);
    expect(store.maps).toEqual([]);
    expect(store.assetManifest).toEqual([]);
  });
});
