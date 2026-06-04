/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const layoutUIStoreMock = vi.hoisted(() => ({
  vttSidebarCollapsed: false,
  vttEntityListCollapsed: false,
  toggleVttSidebar: vi.fn((collapsed: boolean) => {
    layoutUIStoreMock.vttSidebarCollapsed = collapsed;
  }),
  toggleVttEntityList: vi.fn((collapsed: boolean) => {
    layoutUIStoreMock.vttEntityListCollapsed = collapsed;
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

vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: layoutUIStoreMock,
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

  it("renders the expanded sidebar and entity count", () => {
    renderSidebar();

    expect(screen.getByLabelText("VTT Sidebar")).not.toBeNull();
    expect(screen.getByText("Vault Entities")).not.toBeNull();
    expect(screen.getByText("3")).not.toBeNull();
    expect(
      screen.getByText("Select a token to view its details."),
    ).not.toBeNull();
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
});
