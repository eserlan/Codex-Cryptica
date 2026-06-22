/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$lib/components/entity/EmbeddedEntityView.svelte", async () => {
  const mod = await import("./test-fixtures/EmbeddedEntityViewStub.svelte");
  return { default: mod.default };
});

vi.mock("$lib/stores/ui/navigation", () => ({
  focusEntity: vi.fn(),
}));

import EntityExplorerWorkspace from "./EntityExplorerWorkspace.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { focusEntity } from "$lib/stores/ui/navigation";

describe("EntityExplorerWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    layoutUIStore.focusedEntityId = null;
    layoutUIStore.leftSidebarOpen = true;
    layoutUIStore.activeSidebarTool = "explorer";
  });

  it("renders a stable empty state when no entity is focused", () => {
    render(EntityExplorerWorkspace, { entityId: null });

    expect(screen.getByText(/select an entity/i)).toBeTruthy();
    expect(screen.queryByTestId("embedded-entity-view")).toBeNull();
  });

  it("renders the embedded entity view when an entity is focused", () => {
    render(EntityExplorerWorkspace, { entityId: "entity-1" });

    expect(screen.getByTestId("embedded-entity-view")).toBeTruthy();
    expect(screen.queryByText(/select an entity/i)).toBeNull();
  });

  it("returns to the empty state when the embedded reader closes while Explorer stays open", async () => {
    const { rerender } = render(EntityExplorerWorkspace, { entityId: "entity-1" });

    await fireEvent.click(screen.getByTestId("embedded-close"));
    expect(focusEntity).toHaveBeenCalledWith(null);

    await rerender({ entityId: null });
    expect(screen.getByText(/select an entity/i)).toBeTruthy();
    expect(layoutUIStore.activeSidebarTool).toBe("explorer");
    expect(layoutUIStore.leftSidebarOpen).toBe(true);
  });
});
