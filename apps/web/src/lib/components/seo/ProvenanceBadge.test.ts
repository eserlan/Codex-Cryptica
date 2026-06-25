/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import ProvenanceBadge from "./ProvenanceBadge.svelte";
import { sessionHubStore } from "$lib/stores/session-hub.svelte";

describe("ProvenanceBadge", () => {
  beforeEach(() => {
    sessionHubStore.clear();
  });

  it("renders nothing if there is no record", () => {
    const { container } = render(ProvenanceBadge, {
      props: { record: undefined, onSelect: vi.fn() },
    });
    expect(container.innerHTML).toBe("<!---->");
  });

  it("renders nothing if there are no used entities", () => {
    const record = {
      resultEntityId: "123",
      usedEntityIds: [],
      offeredEntityIds: ["abc"],
      trimmed: false,
    };
    const { container } = render(ProvenanceBadge, {
      props: { record, onSelect: vi.fn() },
    });
    expect(container.innerHTML).toBe("<!---->");
  });

  it("renders the badge when used entities are present and in the store", async () => {
    const id = sessionHubStore.addEntity({
      type: "character",
      title: "Lord Vane",
      content: "A lord",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    const record = {
      resultEntityId: "123",
      usedEntityIds: [id],
      offeredEntityIds: [id],
      trimmed: false,
    };

    render(ProvenanceBadge, { props: { record, onSelect: vi.fn() } });
    expect(screen.getByText("Used context:")).toBeTruthy();
    expect(screen.getByText("Lord Vane")).toBeTruthy();
  });

  it("calls onSelect when an entity link is clicked", async () => {
    const id = sessionHubStore.addEntity({
      type: "character",
      title: "Lord Vane",
      content: "A lord",
      labels: [],
      status: "active",
      reuseEnabled: true,
      pinned: false,
    });

    const record = {
      resultEntityId: "123",
      usedEntityIds: [id],
      offeredEntityIds: [id],
      trimmed: false,
    };

    const onSelect = vi.fn();
    render(ProvenanceBadge, { props: { record, onSelect } });

    const btn = screen.getByText("Lord Vane");
    await fireEvent.click(btn);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].id).toBe(id);
  });
});
