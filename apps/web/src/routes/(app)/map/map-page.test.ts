/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const controllerState = vi.hoisted(() => ({
  activeMap: { id: "map-1" },
  showInitiativePanel: false,
  hasSelectedToken: false,
  vttEntityCount: 2,
  chatSidebarOffset: "20rem",
  showUpload: false,
  showVttShare: true,
  mapName: "",
  files: null,
  isDragging: false,
  openShareModal: vi.fn(),
  handleEntityDragStart: vi.fn(),
  handleEntityDragEnd: vi.fn(),
  onDragOver: vi.fn(),
  onDragLeave: vi.fn(),
  onDrop: vi.fn(),
  handleUpload: vi.fn(),
  cancelUpload: vi.fn(),
  syncActiveVault: vi.fn(),
  setVttChatSidebarCollapsed: vi.fn(),
}));

vi.mock("$lib/stores/map/map-page-controller.svelte", () => ({
  MapPageController: class MapPageControllerMock {
    activeMap = controllerState.activeMap;
    showInitiativePanel = controllerState.showInitiativePanel;
    hasSelectedToken = controllerState.hasSelectedToken;
    vttEntityCount = controllerState.vttEntityCount;
    chatSidebarOffset = controllerState.chatSidebarOffset;
    showUpload = controllerState.showUpload;
    showVttShare = controllerState.showVttShare;
    mapName = controllerState.mapName;
    files = controllerState.files;
    isDragging = controllerState.isDragging;
    openShareModal = controllerState.openShareModal;
    handleEntityDragStart = controllerState.handleEntityDragStart;
    handleEntityDragEnd = controllerState.handleEntityDragEnd;
    onDragOver = controllerState.onDragOver;
    onDragLeave = controllerState.onDragLeave;
    onDrop = controllerState.onDrop;
    handleUpload = controllerState.handleUpload;
    cancelUpload = controllerState.cancelUpload;
    syncActiveVault = controllerState.syncActiveVault;
    setVttChatSidebarCollapsed = controllerState.setVttChatSidebarCollapsed;
  },
}));

vi.mock("$lib/components/map/MapHUD.svelte", () => ({
  default: function MapHUDMock() {
    return {};
  },
}));

vi.mock("$lib/components/map/MapUploadOverlay.svelte", () => ({
  default: function MapUploadOverlayMock() {
    return {};
  },
}));

vi.mock("$lib/components/map/MapView.svelte", () => ({
  default: function MapViewMock() {
    return {};
  },
}));

vi.mock("$lib/components/map/MapVTTControlsHUD.svelte", () => ({
  default: function MapVTTControlsHUDMock() {
    return {};
  },
}));

vi.mock("$lib/components/map/VTTGridColorMenu.svelte", () => ({
  default: function VTTGridColorMenuMock() {
    return {};
  },
}));

vi.mock("$lib/components/vtt/TokenAddDialog.svelte", () => ({
  default: function TokenAddDialogMock() {
    return {};
  },
}));

vi.mock("$lib/components/vtt/MapVTTSidebar.svelte", () => ({
  default: function MapVTTSidebarMock() {
    return {};
  },
}));

vi.mock("$lib/components/ShareModal.svelte", async () => ({
  default: (await import("$lib/components/modals/__tests__/ModalStub.svelte"))
    .default,
}));

const mapStoreMock = vi.hoisted(() => ({
  activeMap: { id: "map-1" } as { id: string } | null,
}));

vi.mock("$lib/stores/map.svelte", () => ({
  mapStore: mapStoreMock,
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: {
    vttEnabled: true,
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    activeVaultId: "vault-1",
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {},
}));

const sessionModeStoreMock = vi.hoisted(() => ({ isGuestMode: false }));
const guestVaultMock = vi.hoisted(() => ({ publishId: null as string | null }));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: sessionModeStoreMock,
}));

vi.mock("$lib/stores/guest-vault.svelte", () => ({
  guestVault: guestVaultMock,
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    openZenMode: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: {
    vttChatSidebarCollapsed: false,
  },
}));

import MapPage from "./+page.svelte";

describe("map/+page", () => {
  beforeEach(() => {
    mapStoreMock.activeMap = { id: "map-1" };
    sessionModeStoreMock.isGuestMode = false;
    guestVaultMock.publishId = null;
  });

  it("does not mount ShareModal locally even if a controller-local share flag exists", () => {
    render(MapPage);

    expect(screen.queryByTestId("modal-stub")).toBeNull();
  });

  it("shows a 'no maps published' message for a published-vault reader with no maps", () => {
    mapStoreMock.activeMap = null;
    sessionModeStoreMock.isGuestMode = true;
    guestVaultMock.publishId = "pub-1";

    render(MapPage);

    expect(screen.getByText("No maps published")).not.toBeNull();
    expect(screen.queryByText("Waiting for host")).toBeNull();
  });

  it("shows a 'waiting for host' message for a live VTT guest with no shared map", () => {
    mapStoreMock.activeMap = null;
    sessionModeStoreMock.isGuestMode = true;
    guestVaultMock.publishId = null;

    render(MapPage);

    expect(screen.getByText("Waiting for host")).not.toBeNull();
    expect(screen.queryByText("No maps published")).toBeNull();
  });
});
