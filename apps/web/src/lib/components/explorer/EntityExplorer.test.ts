/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./EntityList.svelte", async () => {
  const mod = await import("./test-fixtures/EntityListStub.svelte");
  return { default: mod.default };
});

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    allEntities: [],
    isGuest: false,
    selectedEntityId: null,
    updateEntity: vi.fn(),
    deleteEntity: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    openZenMode: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/navigation", () => ({
  focusEntity: vi.fn(),
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    notify: vi.fn(),
  },
}));

import EntityExplorer from "./EntityExplorer.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { focusEntity } from "$lib/stores/ui/navigation";

describe("EntityExplorer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    layoutUIStore.isMobile = false;
    layoutUIStore.leftSidebarOpen = true;
    layoutUIStore.activeSidebarTool = "explorer";
    layoutUIStore.isWideViewport = false;
  });

  it("routes desktop selection through focus mode when the Explorer workspace is eligible", async () => {
    layoutUIStore.isWideViewport = true;
    render(EntityExplorer);

    await fireEvent.click(screen.getByTestId("entity-select"));

    expect(layoutUIStore.focusedEntityId).toBe("entity-1");
    expect(layoutUIStore.mainViewMode).toBe("focus");
    expect(focusEntity).not.toHaveBeenCalled();
    expect(modalUIStore.openZenMode).not.toHaveBeenCalled();
  });

  it("uses the same focus flow for the Explorer Zen action when the workspace is eligible", async () => {
    layoutUIStore.isWideViewport = true;
    render(EntityExplorer);

    await fireEvent.click(screen.getByTestId("entity-open-zen"));

    expect(layoutUIStore.focusedEntityId).toBe("entity-1");
    expect(layoutUIStore.mainViewMode).toBe("focus");
    expect(focusEntity).not.toHaveBeenCalled();
    expect(modalUIStore.openZenMode).not.toHaveBeenCalled();
  });

  it("retains modal Zen Mode selection below the desktop threshold", async () => {
    render(EntityExplorer);

    await fireEvent.click(screen.getByTestId("entity-select"));

    expect(modalUIStore.openZenMode).toHaveBeenCalledWith("entity-1");
    expect(focusEntity).not.toHaveBeenCalled();
  });

  it("retains modal Zen Mode selection when another sidebar tool is active", async () => {
    layoutUIStore.isWideViewport = true;
    layoutUIStore.activeSidebarTool = "oracle";
    render(EntityExplorer);

    await fireEvent.click(screen.getByTestId("entity-select"));

    expect(modalUIStore.openZenMode).toHaveBeenCalledWith("entity-1");
    expect(focusEntity).not.toHaveBeenCalled();
  });
});
