/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./ResizerHandle.svelte", () => ({
  default: function ResizerHandleMock() {
    return {};
  },
}));

vi.mock("../oracle/OracleSidebarPanel.svelte", async () => {
  const mod = await import("./test-fixtures/OracleSidebarPanelStub.svelte");
  return { default: mod.default };
});

vi.mock("../explorer/EntityExplorer.svelte", () => ({
  default: function EntityExplorerMock() {
    return {
      $$render: () =>
        '<div data-testid="entity-explorer-panel">Entity Explorer</div>',
    };
  },
}));

vi.mock("$lib/stores/debug.svelte", () => ({
  debugStore: {
    error: vi.fn(),
  },
}));

import SidebarPanelHost from "./SidebarPanelHost.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";

describe("SidebarPanelHost", () => {
  beforeEach(() => {
    layoutUIStore.leftSidebarOpen = false;
    layoutUIStore.activeSidebarTool = "none";
    layoutUIStore.isMobile = false;
    layoutUIStore.leftSidebarWidth = 280;
  });

  it("renders the Oracle sidebar panel when the Oracle tool is open", async () => {
    layoutUIStore.leftSidebarOpen = true;
    layoutUIStore.activeSidebarTool = "oracle";

    render(SidebarPanelHost);

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-panel-host")).toBeTruthy();
      expect(screen.getByTestId("oracle-sidebar-panel")).toBeTruthy();
    });
  });

  it("does not render the host when the left sidebar is closed", () => {
    render(SidebarPanelHost);

    expect(screen.queryByTestId("sidebar-panel-host")).toBeNull();
    expect(screen.queryByTestId("oracle-sidebar-panel")).toBeNull();
  });
});
