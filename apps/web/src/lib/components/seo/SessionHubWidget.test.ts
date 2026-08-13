// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import SessionHubWidget from "./SessionHubWidget.svelte";
import { sessionHubStore } from "$lib/stores/session-hub.svelte";

describe("SessionHubWidget", () => {
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

  it("renders empty state when no entities", () => {
    render(SessionHubWidget);
    expect(screen.getByText("Session Hub")).toBeTruthy();
    expect(
      screen.getByText(/Generated drafts appear here automatically/i),
    ).toBeTruthy();
    expect(screen.queryByText(/Link to Hub/i)).toBeNull();
  });

  it("renders a list of entities from the store", async () => {
    sessionHubStore.addEntity({
      type: "character",
      title: "Elara",
      content: "A hero",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });
    sessionHubStore.addEntity({
      type: "location",
      title: "Waterdeep",
      content: "A city",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    render(SessionHubWidget);

    expect(screen.getByText("Elara")).toBeTruthy();
    expect(screen.getByText("Waterdeep")).toBeTruthy();
    // Type is conveyed by an icon before the name (no text label).
    expect(document.querySelector(".icon-\\[lucide--user\\]")).toBeTruthy();
    expect(document.querySelector(".icon-\\[lucide--map-pin\\]")).toBeTruthy();
  });

  it("calls onSelect when an item is clicked", async () => {
    const id = sessionHubStore.addEntity({
      type: "character",
      title: "Elara",
      content: "A hero",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    const onSelect = vi.fn();
    render(SessionHubWidget, { props: { onSelect } });

    const btn = screen.getByText("Elara").closest("button");
    expect(btn).not.toBeNull();

    if (btn) {
      await fireEvent.click(btn);
    }

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe(id);
    expect(onSelect.mock.calls[0][0].title).toBe("Elara");
  });

  it("toggles reuseEnabled when the zap button is clicked", async () => {
    sessionHubStore.addEntity({
      type: "character",
      title: "Elara",
      content: "A hero",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    render(SessionHubWidget);

    const toggleBtn = screen.getByTitle("Context reuse enabled");
    await fireEvent.click(toggleBtn);

    expect(sessionHubStore.entities[0].reuseEnabled).toBe(false);
  });

  it("toggles pinned when the pin button is clicked", async () => {
    sessionHubStore.addEntity({
      type: "character",
      title: "Elara",
      content: "A hero",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    render(SessionHubWidget);

    const toggleBtn = screen.getByTitle("Not pinned");
    await fireEvent.click(toggleBtn);

    expect(sessionHubStore.entities[0].pinned).toBe(true);
  });

  it("toggles save selection without changing context reuse", async () => {
    sessionHubStore.addEntity({
      type: "character",
      title: "Elara",
      content: "A hero",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    render(SessionHubWidget);

    const toggleBtn = screen.getByTitle("Included when saving");
    await fireEvent.click(toggleBtn);

    expect(sessionHubStore.entities[0].selectedForSave).toBe(false);
    expect(sessionHubStore.entities[0].reuseEnabled).toBe(true);
    expect(screen.getByTitle("Excluded when saving")).toBeTruthy();
  });

  it("saves the marked subset or the whole session", async () => {
    sessionHubStore.addEntity({
      type: "character",
      title: "Elara",
      content: "A hero",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });
    const excludedId = sessionHubStore.addEntity({
      type: "location",
      title: "Waterdeep",
      content: "A city",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });
    sessionHubStore.updateEntity(excludedId, { selectedForSave: false });

    const onSave = vi.fn();
    render(SessionHubWidget, { props: { onSave } });

    await fireEvent.click(
      screen.getByRole("button", { name: "Save selected (1)" }),
    );
    expect(onSave).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([expect.objectContaining({ title: "Elara" })]),
    );
    expect(onSave.mock.calls[0][0]).toHaveLength(1);

    await fireEvent.click(screen.getByRole("button", { name: "Save all (2)" }));
    expect(onSave.mock.calls[1][0]).toHaveLength(2);
  });

  it("removes entity when trash button is clicked", async () => {
    sessionHubStore.addEntity({
      type: "character",
      title: "Elara",
      content: "A hero",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    render(SessionHubWidget);
    const removeBtn = screen.getByTitle("Remove draft");
    await fireEvent.click(removeBtn);

    expect(sessionHubStore.entities.length).toBe(0);
  });
});
