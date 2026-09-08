/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = vi.fn().mockReturnValue({
    finished: Promise.resolve(),
    cancel: vi.fn(),
    onfinish: null,
  });
}

vi.mock("../zen/ZenView.svelte", async () => ({
  default: (await import("./__tests__/ZenViewStub.svelte")).default,
}));

vi.mock("$lib/stores/ui/navigation", () => ({
  focusEntity: vi.fn(),
}));

let isExplorerWorkspace = false;

vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: {
    get isEntityExplorerWorkspace() {
      return isExplorerWorkspace;
    },
    clearEntityExplorerWorkspaceFocus: vi.fn(),
  },
}));

import EmbeddedEntityView from "./EmbeddedEntityView.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { focusEntity } from "$lib/stores/ui/navigation";

describe("EmbeddedEntityView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isExplorerWorkspace = false;
  });

  it("renders container and dynamically loads ZenView with entityId", async () => {
    render(EmbeddedEntityView, { entityId: "test-entity-1" });

    expect(screen.getByTestId("embedded-entity-view")).toBeTruthy();
    expect(await screen.findByTestId("zen-view-stub")).toBeTruthy();
    expect(screen.getByText("test-entity-1")).toBeTruthy();
  });

  it("calls focusEntity(null) when onClose is triggered and not in explorer workspace", async () => {
    isExplorerWorkspace = false;
    render(EmbeddedEntityView, { entityId: "test-entity-1" });

    const closeBtn = await screen.findByTestId("zen-close-btn");
    await fireEvent.click(closeBtn);

    expect(focusEntity).toHaveBeenCalledWith(null);
    expect(
      layoutUIStore.clearEntityExplorerWorkspaceFocus,
    ).not.toHaveBeenCalled();
  });

  it("calls clearEntityExplorerWorkspaceFocus when onClose is triggered in explorer workspace", async () => {
    isExplorerWorkspace = true;
    render(EmbeddedEntityView, { entityId: "test-entity-1" });

    const closeBtn = await screen.findByTestId("zen-close-btn");
    await fireEvent.click(closeBtn);

    expect(layoutUIStore.clearEntityExplorerWorkspaceFocus).toHaveBeenCalled();
    expect(focusEntity).not.toHaveBeenCalled();
  });
});
