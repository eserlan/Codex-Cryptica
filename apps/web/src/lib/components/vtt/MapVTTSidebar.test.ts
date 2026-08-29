/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const layoutUIStoreMock = vi.hoisted(() => ({
  vttSidebarCollapsed: false,
  vttEntityListCollapsed: false,
  vttSidebarWidth: 352,
  isMobile: false,
  toggleVttSidebar: vi.fn((collapsed: boolean) => {
    layoutUIStoreMock.vttSidebarCollapsed = collapsed;
  }),
  toggleVttEntityList: vi.fn((collapsed: boolean) => {
    layoutUIStoreMock.vttEntityListCollapsed = collapsed;
  }),
  setVttSidebarWidth: vi.fn((width: number) => {
    layoutUIStoreMock.vttSidebarWidth = width;
  }),
}));

const sessionModeStoreMock = vi.hoisted(() => ({
  isGuestMode: false,
}));

vi.mock("$lib/components/map/VTTControls.svelte", () => ({
  default: function VTTControlsMock() {
    return {};
  },
}));

vi.mock("$lib/components/explorer/EntityList.svelte", () => ({
  default: function EntityListMock() {
    return {};
  },
}));

vi.mock("$lib/components/vtt/InitiativePanel.svelte", () => ({
  default: function InitiativePanelMock() {
    return {};
  },
}));

vi.mock("$lib/components/vtt/TokenDetail.svelte", () => ({
  default: function TokenDetailMock() {
    return {};
  },
}));

vi.mock("$lib/components/vtt/VTTChatSidebar.svelte", () => ({
  default: function VTTChatSidebarMock() {
    return {};
  },
}));

vi.mock("$lib/components/vtt/TileDeckPanel.svelte", () => ({
  default: function TileDeckPanelMock() {
    return {};
  },
}));

vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: layoutUIStoreMock,
  MIN_VTT_SIDEBAR_WIDTH: 280,
  MAX_SIDEBAR_VW: 40,
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    openZenMode: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: sessionModeStoreMock,
}));

import MapVTTSidebar from "./MapVTTSidebar.svelte";

function renderSidebar(overrides = {}) {
  return render(MapVTTSidebar, {
    props: {
      isVttChatSidebarCollapsed: false,
      showInitiativePanel: false,
      hasSelectedToken: false,
      vttEntityCount: 3,
      onVttChatSidebarCollapsed: vi.fn(),
      onEntitySelect: vi.fn(),
      onEntityDragStart: vi.fn(),
      onEntityDragEnd: vi.fn(),
      onShare: vi.fn(),
      ...overrides,
    },
  });
}

describe("MapVTTSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    layoutUIStoreMock.vttSidebarCollapsed = false;
    layoutUIStoreMock.vttEntityListCollapsed = false;
    sessionModeStoreMock.isGuestMode = false;
  });

  it("renders the expanded sidebar, middle workspace, and entity count", () => {
    renderSidebar();

    expect(screen.getByLabelText("VTT Sidebar")).not.toBeNull();
    expect(screen.getByTestId("vtt-middle-workspace")).not.toBeNull();
    expect(screen.getByText("Vault Entities")).not.toBeNull();
    expect(screen.getByText("3")).not.toBeNull();
    expect(screen.queryByTestId("vtt-pinned-inspector")).toBeNull();
  });

  it("renders the pinned contextual inspector when a token is selected", () => {
    renderSidebar({ hasSelectedToken: true });

    expect(screen.getByTestId("vtt-pinned-inspector")).not.toBeNull();
  });

  it("collapses the right sidebar through the layout store", async () => {
    renderSidebar();

    await fireEvent.click(
      screen.getByRole("button", { name: "Collapse VTT Sidebar" }),
    );

    expect(layoutUIStoreMock.toggleVttSidebar).toHaveBeenCalledWith(true);
  });

  it("hides host-only entity and share controls for guests", () => {
    sessionModeStoreMock.isGuestMode = true;

    renderSidebar();

    expect(screen.queryByText("Vault Entities")).toBeNull();
    expect(screen.queryByRole("button", { name: "Share Campaign" })).toBeNull();
  });

  it("renders the horizontal resizer handle when expanded on desktop", () => {
    layoutUIStoreMock.vttSidebarCollapsed = false;
    layoutUIStoreMock.isMobile = false;

    renderSidebar();

    expect(screen.getByTestId("resizer-handle-right")).not.toBeNull();
  });

  it("omits the resizer handle when collapsed or on mobile", () => {
    layoutUIStoreMock.vttSidebarCollapsed = true;
    const { unmount } = renderSidebar();
    expect(screen.queryByTestId("resizer-handle-right")).toBeNull();
    unmount();

    layoutUIStoreMock.vttSidebarCollapsed = false;
    layoutUIStoreMock.isMobile = true;
    renderSidebar();
    expect(screen.queryByTestId("resizer-handle-right")).toBeNull();
  });
});
