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
    expect(screen.getByText(/Generate drafts and click/i)).toBeTruthy();
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
    expect(screen.getByText("character")).toBeTruthy();
    expect(screen.getByText("location")).toBeTruthy();
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
