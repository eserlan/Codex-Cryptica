/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

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

vi.mock("$lib/stores/map.svelte", () => ({
  mapStore: {
    activeMap: { id: "map-1" },
  },
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

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: {
    isGuestMode: false,
  },
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
  it("does not mount ShareModal locally even if a controller-local share flag exists", () => {
    render(MapPage);

    expect(screen.queryByTestId("modal-stub")).toBeNull();
  });
});
