/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mapStoreMock = vi.hoisted(() => ({
  activeMapId: "map-1",
  activeMap: {
    id: "map-1",
    name: "World",
    isWorldMap: false,
  },
  canGoBack: false,
  goBack: vi.fn(),
  selectMap: vi.fn(),
  setAsWorldMap: vi.fn(),
}));

const vaultMock = vi.hoisted(() => ({
  maps: {
    "map-1": {
      id: "map-1",
      name: "World",
      isWorldMap: false,
    },
  },
  allMaps: [{ id: "map-1", name: "World", isWorldMap: false }],
  deleteMap: vi.fn(),
}));

const sessionModeStoreMock = vi.hoisted(() => ({
  isGuestMode: false,
}));

const guestVaultMock = vi.hoisted(() => ({
  publishId: null as string | null,
}));

vi.mock("$lib/components/vtt/GuestInfoOverlay.svelte", () => ({
  default: function GuestInfoOverlayMock() {
    return {};
  },
}));

vi.mock("$lib/cloud-bridge/p2p/host-service.svelte", () => ({
  p2pHost: {
    isHosting: false,
    broadcastActiveMapSync: vi.fn(),
  },
}));

vi.mock("$lib/stores/map.svelte", () => ({
  mapStore: mapStoreMock,
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: vaultMock,
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    confirm: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: sessionModeStoreMock,
}));

vi.mock("$lib/stores/guest-vault.svelte", () => ({
  guestVault: guestVaultMock,
}));

import MapHUD from "./MapHUD.svelte";
import { layoutUIStore } from "$lib/stores/ui/layout-ui.svelte";
import { mapControlsUIStore } from "$lib/stores/ui/map-controls-ui.svelte";

describe("MapHUD", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionModeStoreMock.isGuestMode = false;
    guestVaultMock.publishId = null;
    layoutUIStore.isMobile = false;
    mapControlsUIStore.open = false;
    vaultMock.allMaps = [{ id: "map-1", name: "World", isWorldMap: false }];
    mapStoreMock.activeMap = {
      id: "map-1",
      name: "World",
      isWorldMap: false,
    };
  });

  it("renders host map actions and opens upload flow", async () => {
    const onShowUpload = vi.fn();
    render(MapHUD, {
      props: {
        chatSidebarOffset: "20rem",
        onShowUpload,
      },
    });

    expect(screen.getByRole("button", { name: "Add Map" })).not.toBeNull();

    await fireEvent.click(screen.getByRole("button", { name: "Add Map" }));

    expect(onShowUpload).toHaveBeenCalled();
  });

  describe("back button", () => {
    it("is absent until the user has followed a link to another map", () => {
      mapStoreMock.canGoBack = false;
      render(MapHUD, {
        props: { chatSidebarOffset: "20rem", onShowUpload: vi.fn() },
      });

      expect(screen.queryByTestId("map-back-button")).toBeNull();
    });

    it("is compact (icon only on phones) but still named for assistive tech", async () => {
      mapStoreMock.canGoBack = true;
      render(MapHUD, {
        props: { chatSidebarOffset: "20rem", onShowUpload: vi.fn() },
      });

      const back = screen.getByRole("button", {
        name: "Back to the previous map",
      });
      expect(back.querySelector("span.hidden.sm\\:inline")?.textContent).toBe(
        "BACK",
      );

      await fireEvent.click(back);
      expect(mapStoreMock.goBack).toHaveBeenCalledTimes(1);
      mapStoreMock.canGoBack = false;
    });
  });

  describe("on phones", () => {
    it("keeps the map switcher but hides the other actions until revealed", () => {
      layoutUIStore.isMobile = true;
      render(MapHUD, {
        props: { chatSidebarOffset: "20rem", onShowUpload: vi.fn() },
      });

      expect(screen.getByLabelText("Select Map")).not.toBeNull();
      expect(screen.queryByRole("button", { name: "Add Map" })).toBeNull();
      expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    });

    it("shows every action once the controls are revealed", () => {
      layoutUIStore.isMobile = true;
      mapControlsUIStore.open = true;
      render(MapHUD, {
        props: { chatSidebarOffset: "20rem", onShowUpload: vi.fn() },
      });

      expect(screen.getByLabelText("Select Map")).not.toBeNull();
      expect(screen.getByRole("button", { name: "Add Map" })).not.toBeNull();
    });

    it("still shows all actions on larger screens without any toggle", () => {
      layoutUIStore.isMobile = false;
      render(MapHUD, {
        props: { chatSidebarOffset: "20rem", onShowUpload: vi.fn() },
      });

      expect(screen.getByRole("button", { name: "Add Map" })).not.toBeNull();
    });
  });

  it("offers the note button out of play, and leaves it to the VTT toolbar in play", async () => {
    const { mapSession } = await import("$lib/stores/map-session.svelte");
    mapSession.setVttEnabled(false);

    const { unmount } = render(MapHUD, {
      props: { chatSidebarOffset: "20rem", onShowUpload: vi.fn() },
    });

    expect(screen.getByRole("button", { name: "Pin Note" })).not.toBeNull();
    unmount();

    mapSession.setVttEnabled(true);
    render(MapHUD, {
      props: { chatSidebarOffset: "20rem", onShowUpload: vi.fn() },
    });

    expect(screen.queryByRole("button", { name: "Pin Note" })).toBeNull();
    mapSession.setVttEnabled(false);
  });

  it("hides the note button from guests", async () => {
    const { mapSession } = await import("$lib/stores/map-session.svelte");
    mapSession.setVttEnabled(false);
    sessionModeStoreMock.isGuestMode = true;

    render(MapHUD, {
      props: { chatSidebarOffset: "20rem", onShowUpload: vi.fn() },
    });

    expect(screen.queryByRole("button", { name: "Pin Note" })).toBeNull();
  });

  it("renders only the active map name for a live VTT guest", () => {
    sessionModeStoreMock.isGuestMode = true;
    guestVaultMock.publishId = null;

    render(MapHUD, {
      props: {
        chatSidebarOffset: "20rem",
        onShowUpload: vi.fn(),
      },
    });

    expect(screen.getByText("World")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Add Map" })).toBeNull();
    expect(screen.queryByLabelText("Select Map")).toBeNull();
  });

  it("lets a published-vault reader switch between all published maps", async () => {
    sessionModeStoreMock.isGuestMode = true;
    guestVaultMock.publishId = "pub-1";
    vaultMock.allMaps = [
      { id: "map-1", name: "World", isWorldMap: true },
      { id: "map-2", name: "Dungeon", isWorldMap: false },
    ];

    render(MapHUD, {
      props: {
        chatSidebarOffset: "20rem",
        onShowUpload: vi.fn(),
      },
    });

    const select = screen.getByLabelText("Select Map") as HTMLSelectElement;
    expect(select).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Add Map" })).toBeNull();

    await fireEvent.change(select, { target: { value: "map-2" } });
    expect(mapStoreMock.selectMap).toHaveBeenCalledWith("map-2");
  });
});
