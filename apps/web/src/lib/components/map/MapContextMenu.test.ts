/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mapStoreMock = vi.hoisted(() => ({
  isGMMode: true,
  gridSize: 50,
  gridOffsetX: 0,
  gridOffsetY: 0,
  formatHex: vi.fn((_hex) => `B03`),
}));

const notificationStoreMock = vi.hoisted(() => ({
  notify: vi.fn(),
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
  bringTokenToFront: vi.fn(),
}));

const sessionModeStoreMock = vi.hoisted(() => ({
  isGuestMode: false,
}));

const vaultMock = vi.hoisted(() => ({
  entities: {} as Record<string, { image?: string | null }>,
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
vi.mock("$lib/stores/vault.svelte", () => ({ vault: vaultMock }));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: notificationStoreMock,
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
    (token as any).entityId = null;
    (token as any).imageUrl = null;
    vaultMock.entities = {};
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

  it("shows Image focus options when the linked entity has a portrait, even with no token-level imageUrl", async () => {
    (token as any).entityId = "kratian";
    (token as any).imageUrl = null;
    vaultMock.entities = { kratian: { image: "images/kratian.webp" } };
    renderMenu();

    await fireEvent.click(screen.getByRole("menuitem", { name: "Appearance" }));

    await fireEvent.click(screen.getByRole("menuitemradio", { name: /Top/ }));
    expect(mapSessionMock.updateToken).toHaveBeenCalledWith("token-1", {
      imageFocus: "top",
    });
  });

  it("hides Image focus options when the token has no image at all", async () => {
    renderMenu();

    await fireEvent.click(screen.getByRole("menuitem", { name: "Appearance" }));

    expect(screen.queryByRole("menuitemradio", { name: /Top/ })).toBeNull();
  });

  it("moves a token to a different layer and brings it to the front of it", async () => {
    renderMenu();

    await fireEvent.click(
      screen.getByRole("menuitem", { name: "Move to Layer" }),
    );
    await fireEvent.click(
      screen.getByRole("menuitemradio", { name: /Furniture/ }),
    );

    expect(mapSessionMock.updateToken).toHaveBeenCalledWith("token-1", {
      layer: "object",
    });
    expect(mapSessionMock.bringTokenToFront).toHaveBeenCalledWith("token-1");
  });

  it("does not expose Move to Layer to guests", () => {
    sessionModeStoreMock.isGuestMode = true;
    renderMenu();

    expect(
      screen.queryByRole("menuitem", { name: "Move to Layer" }),
    ).toBeNull();
  });
});

describe("MapContextMenu hex actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("shows hex coordinate header and copies coordinate to clipboard", async () => {
    const onClose = vi.fn();
    render(MapContextMenu, {
      props: {
        x: 10,
        y: 20,
        imgX: 50,
        imgY: 50,
        hex: { q: 1, r: 2, fogged: false },
        onClose,
      },
    });

    expect(screen.getByText("Hex B03")).toBeTruthy();

    const copyBtn = screen.getByRole("menuitem", {
      name: /Copy hex coordinate/,
    });
    await fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("B03");
    expect(notificationStoreMock.notify).toHaveBeenCalledWith(
      'Copied hex coordinate "B03"',
      "info",
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("uses a numeric coordinate when map labels are disabled", async () => {
    mapStoreMock.formatHex.mockReturnValue("");
    const onClose = vi.fn();
    render(MapContextMenu, {
      props: {
        x: 10,
        y: 20,
        imgX: 50,
        imgY: 50,
        hex: { q: 1, r: 2, fogged: false },
        onClose,
      },
    });

    expect(screen.getByText("Hex 01.02")).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("menuitem", { name: /Copy hex coordinate/ }),
    );

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("01.02");
    expect(onClose).toHaveBeenCalled();
  });

  it("reports clipboard failures and closes the menu", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard denied"));
    Object.assign(navigator, { clipboard: { writeText } });
    const onClose = vi.fn();
    render(MapContextMenu, {
      props: {
        x: 10,
        y: 20,
        imgX: 50,
        imgY: 50,
        hex: { q: 1, r: 2, fogged: false },
        onClose,
      },
    });

    await fireEvent.click(
      screen.getByRole("menuitem", { name: /Copy hex coordinate/ }),
    );

    expect(notificationStoreMock.notify).toHaveBeenCalledWith(
      "Failed to copy hex coordinate",
      "error",
    );
    expect(onClose).toHaveBeenCalled();
  });
});
