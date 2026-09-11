/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getSessionContext } from "./session-context";
import { sessionHubStore } from "$lib/stores/session-hub.svelte";

describe("getSessionContext", () => {
  beforeEach(() => {
    // Add mock sessionStorage for the store if needed
    const mockStorage: Record<string, string> = {};
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        for (const key in mockStorage) delete mockStorage[key];
      },
    });
    sessionHubStore.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns empty string when there are no entities", () => {
    expect(getSessionContext()).toBe("");
  });

  it("returns formatted context string for available entities", () => {
    sessionHubStore.addEntity({
      type: "character",
      title: "Elara",
      summary: "A heroic warrior",
      content: "Deep lore about Elara",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });
    sessionHubStore.addEntity({
      type: "location",
      title: "Waterdeep",
      summary: "A bustling city",
      content: "Details about the city",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    const context = getSessionContext();
    expect(context).toContain(
      "Existing campaign elements created this session",
    );
    expect(context).toContain("- Elara (character): A heroic warrior");
    expect(context).toContain("- Waterdeep (location): A bustling city");
  });

  it("ignores entities with reuseEnabled set to false", () => {
    sessionHubStore.addEntity({
      type: "character",
      title: "Elara",
      summary: "A heroic warrior",
      content: "",
      labels: [],
      status: "active",
      reuseEnabled: false,
      pinned: false,
    });
    sessionHubStore.addEntity({
      type: "location",
      title: "Waterdeep",
      summary: "A bustling city",
      content: "",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    const context = getSessionContext();
    expect(context).not.toContain("Elara");
    expect(context).toContain("Waterdeep");
  });

  it("can exclude prior language drafts while retaining other campaign context", () => {
    sessionHubStore.addEntity({
      type: "note",
      kind: "language",
      title: "Aelori",
      summary: "A previous language identity.",
      content: "",
      labels: ["language", "conlang"],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });
    sessionHubStore.addEntity({
      type: "faction",
      title: "River Court",
      summary: "A useful cultural anchor.",
      content: "",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    const context = getSessionContext({ excludeLanguageDrafts: true });

    expect(context).not.toContain("Aelori");
    expect(context).toContain("River Court");
  });

  it("enforces context budget and truncates over limit", () => {
    // Default budget is 50 in getContextSelection
    for (let i = 0; i < 55; i++) {
      sessionHubStore.addEntity({
        type: "item",
        title: `Item ${i}`,
        summary: `Item description ${i}`,
        content: "",
        labels: [],
        status: "active",
        reuseEnabled: true,
        pinned: false,
      });
    }

    const context = getSessionContext();
    const lines = context.split("\n");
    // Should be exactly 50 entities included
    const entityLines = lines.filter((l) => l.startsWith("- Item"));
    expect(entityLines.length).toBe(50);
  });
});
