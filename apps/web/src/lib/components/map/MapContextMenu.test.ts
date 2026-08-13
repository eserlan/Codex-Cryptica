/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mapStoreMock = vi.hoisted(() => ({
  isGMMode: true,
  gridSize: 50,
  gridOffsetX: 0,
  gridOffsetY: 0,
}));

const token = vi.hoisted(() => ({
  id: "token-1",
  name: "Scout",
  entityId: null,
  x: 0,
  y: 0,
  width: 50,
  height: 50,
  rotation: 0,
  baseShape: "circle" as const,
  facingIndicator: true,
  visibleTo: "all" as const,
  statusEffects: [] as string[],
}));

const mapSessionMock = vi.hoisted(() => ({
  tokens: { "token-1": token },
  selectedTokens: new Set<string>(),
  myPeerId: null,
  pingToken: vi.fn(),
  canViewToken: vi.fn(() => true),
  updateToken: vi.fn(),
  removeToken: vi.fn(),
  cloneToken: vi.fn(),
  toggleTokenVisibility: vi.fn(),
}));

const sessionModeStoreMock = vi.hoisted(() => ({
  isGuestMode: false,
}));

vi.mock("$lib/stores/map.svelte", () => ({ mapStore: mapStoreMock }));
vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: mapSessionMock,
}));
vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: sessionModeStoreMock,
}));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: { openZenMode: vi.fn() },
}));

import MapContextMenu from "./MapContextMenu.svelte";

describe("MapContextMenu appearance controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => ({
        finished: Promise.resolve(),
        cancel: vi.fn(),
      })),
    });
    mapStoreMock.isGMMode = true;
    sessionModeStoreMock.isGuestMode = false;
    token.baseShape = "circle";
    token.facingIndicator = true;
  });

  function renderMenu() {
    return render(MapContextMenu, {
      props: {
        x: 10,
        y: 20,
        imgX: 0,
        imgY: 0,
        tokenId: "token-1",
        onClose: vi.fn(),
      },
    });
  }

  it("lets the host toggle facing and choose a square base", async () => {
    renderMenu();

    await fireEvent.click(screen.getByRole("menuitem", { name: "Appearance" }));
    await fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: /Facing indicator/ }),
    );
    await fireEvent.click(
      screen.getByRole("menuitemradio", { name: "square base" }),
    );

    expect(mapSessionMock.updateToken).toHaveBeenNthCalledWith(1, "token-1", {
      facingIndicator: false,
    });
    expect(mapSessionMock.updateToken).toHaveBeenNthCalledWith(2, "token-1", {
      baseShape: "square",
    });
  });

  it("does not expose host-only appearance controls to guests", () => {
    sessionModeStoreMock.isGuestMode = true;
    renderMenu();

    expect(screen.queryByRole("menuitem", { name: "Appearance" })).toBeNull();
  });
});
