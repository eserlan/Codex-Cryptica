/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

// Stubbed for the same reason as the other two panels: mounting the real one
// would drag in the whole vault and shelf dependency chain for a test about
// which panel the host picks.
vi.mock("#lib/components/shelf/ShelfPanel.svelte", () => ({
  default: function ShelfPanelMock() {
    return {
      $$render: () => '<div data-testid="shelf-panel">The Shelf</div>',
    };
  },
}));

vi.mock("#lib/stores/debug.svelte.js", () => ({
  debugStore: {
    error: vi.fn(),
  },
}));

import SidebarPanelHost from "./SidebarPanelHost.svelte";
import { layoutUIStore } from "#lib/stores/ui/layout-ui.svelte.js";

describe("SidebarPanelHost", () => {
  beforeEach(() => {
    layoutUIStore.leftSidebarOpen = false;
    layoutUIStore.activeSidebarTool = "none";
    layoutUIStore.isMobile = false;
    layoutUIStore.leftSidebarWidth = 280;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the mobile Oracle composer above the soft keyboard", async () => {
    // Chrome on Android can shrink only the visual viewport while fixed
    // overlays remain sized to the layout viewport.
    const fullHeight = window.innerHeight;
    const viewport = Object.assign(new EventTarget(), {
      height: fullHeight,
      offsetTop: 0,
    });
    vi.stubGlobal("visualViewport", viewport);

    layoutUIStore.isMobile = true;
    layoutUIStore.leftSidebarOpen = true;
    layoutUIStore.activeSidebarTool = "oracle";
    render(SidebarPanelHost);

    const sidebar = screen.getByTestId("sidebar-panel-host");
    await waitFor(() =>
      expect(screen.getByTestId("oracle-sidebar-panel")).toBeTruthy(),
    );
    expect(sidebar.style.height).toBe("");

    // Pinned to exactly the visible part, including when the visual viewport
    // has been panned down inside the page.
    viewport.height = fullHeight - 320;
    viewport.offsetTop = 40;
    viewport.dispatchEvent(new Event("resize"));
    await waitFor(() =>
      expect(sidebar.style.height).toBe(`${fullHeight - 320}px`),
    );
    expect(sidebar.style.top).toBe("40px");
    expect(sidebar.style.bottom).toBe("auto");

    viewport.height = fullHeight;
    viewport.offsetTop = 0;
    viewport.dispatchEvent(new Event("resize"));
    await waitFor(() => expect(sidebar.style.height).toBe(""));
    expect(sidebar.style.top).toBe("");
    expect(sidebar.style.bottom).toBe("");
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

  it("does not render the host when left sidebar is open but active tool is none", () => {
    layoutUIStore.leftSidebarOpen = true;
    layoutUIStore.activeSidebarTool = "none";

    render(SidebarPanelHost);

    expect(screen.queryByTestId("sidebar-panel-host")).toBeNull();
  });
});
