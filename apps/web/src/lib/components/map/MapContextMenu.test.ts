/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { snapPointToHexCenter } from "map-engine";

const mapStoreMock = vi.hoisted(() => ({
  isGMMode: true,
  gridSize: 50,
  gridType: "square" as "square" | "hex-pointy" | "hex-flat",
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
  baseShape: "circle" as "circle" | "hex" | "hex-pointy" | "hex-flat",
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

vi.mock("#lib/stores/map.svelte.js", () => ({ mapStore: mapStoreMock }));
vi.mock("#lib/stores/map-session.svelte.js", () => ({
  mapSession: mapSessionMock,
}));
vi.mock("#lib/stores/ui/session-mode.svelte.js", () => ({
  sessionModeStore: sessionModeStoreMock,
}));
vi.mock("#lib/stores/ui/modal-ui.svelte.js", () => ({
  modalUIStore: { openZenMode: vi.fn() },
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({ vault: vaultMock }));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
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
    mapStoreMock.gridType = "square";
    mapStoreMock.gridSize = 50;
    mapStoreMock.gridOffsetX = 0;
    mapStoreMock.gridOffsetY = 0;
    sessionModeStoreMock.isGuestMode = false;
    token.baseShape = "circle";
    token.x = 0;
    token.y = 0;
    token.width = 50;
    token.height = 50;
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

  it("offers half and quarter sizes alongside the whole ones", async () => {
    mapStoreMock.gridType = "hex-pointy";
    renderMenu();
    await fireEvent.click(screen.getByRole("menuitem", { name: "Resize" }));
    const labels = screen
      .getAllByRole("menuitem")
      .map((item) => item.textContent?.trim())
      .filter((text) => /^\d(\.\d+)?x\d/.test(text ?? ""));
    expect(labels).toEqual([
      "0.25x0.25",
      "0.5x0.5",
      "1x1",
      "2x2",
      "3x3",
      "4x4",
    ]);
  });

  it.each([
    ["0.25x0.25", 0.25],
    ["0.5x0.5", 0.5],
  ])(
    "resizes a token to %s of a hex around its snapped centre",
    async (name, fraction) => {
      mapStoreMock.gridType = "hex-pointy";
      token.baseShape = "circle";
      const originalCentre = {
        x: token.x + token.width / 2,
        y: token.y + token.height / 2,
      };
      const snappedCentre = snapPointToHexCenter(originalCentre, {
        orientation: "pointy",
        size: mapStoreMock.gridSize,
        offsetX: mapStoreMock.gridOffsetX,
        offsetY: mapStoreMock.gridOffsetY,
      });
      renderMenu();
      await fireEvent.click(screen.getByRole("menuitem", { name: "Resize" }));
      await fireEvent.click(screen.getByRole("menuitem", { name }));
      const [, update] = mapSessionMock.updateToken.mock.calls[0];
      const side = fraction * Math.sqrt(3) * mapStoreMock.gridSize;
      expect(update.width).toBeCloseTo(side);
      expect(update.height).toBeCloseTo(side);
      expect(update.x + update.width / 2).toBeCloseTo(snappedCentre.x);
      expect(update.y + update.height / 2).toBeCloseTo(snappedCentre.y);
    },
  );

  it.each([
    ["0.25x0.25", 0.25],
    ["0.5x0.5", 0.5],
  ])("resizes a square-grid token to %s of a cell", async (name, fraction) => {
    mapStoreMock.gridType = "square";
    token.x = 100;
    token.y = 150;
    token.width = 50;
    token.height = 50;
    renderMenu();

    await fireEvent.click(screen.getByRole("menuitem", { name: "Resize" }));
    await fireEvent.click(screen.getByRole("menuitem", { name }));

    expect(mapSessionMock.updateToken).toHaveBeenCalledOnce();
    const [, update] = mapSessionMock.updateToken.mock.calls[0];
    expect(update).toMatchObject({
      x: 100,
      y: 150,
      width: fraction * mapStoreMock.gridSize,
      height: fraction * mapStoreMock.gridSize,
    });
  });

  it.each([
    {
      gridType: "hex-pointy",
      baseShape: "circle",
      width: 100 * Math.sqrt(3),
      height: 100 * Math.sqrt(3),
    },
    {
      gridType: "hex-flat",
      baseShape: "circle",
      width: 100 * Math.sqrt(3),
      height: 100 * Math.sqrt(3),
    },
    {
      gridType: "hex-pointy",
      baseShape: "hex",
      width: 100 * Math.sqrt(3),
      height: 200,
    },
    {
      gridType: "hex-flat",
      baseShape: "hex",
      width: 200,
      height: 100 * Math.sqrt(3),
    },
    {
      gridType: "hex-flat",
      baseShape: "hex-pointy",
      width: 100 * Math.sqrt(3),
      height: 200,
    },
    {
      gridType: "hex-pointy",
      baseShape: "hex-flat",
      width: 200,
      height: 100 * Math.sqrt(3),
    },
  ] as const)(
    "resizes a $baseShape token on a $gridType grid around its snapped centre",
    async ({ gridType, baseShape, width, height }) => {
      mapStoreMock.gridType = gridType;
      token.baseShape = baseShape;
      token.x = 7;
      token.y = 11;
      token.width = 41;
      token.height = 37;
      const originalCentre = {
        x: token.x + token.width / 2,
        y: token.y + token.height / 2,
      };
      const snappedCentre = snapPointToHexCenter(originalCentre, {
        orientation: gridType === "hex-flat" ? "flat" : "pointy",
        size: mapStoreMock.gridSize,
        offsetX: mapStoreMock.gridOffsetX,
        offsetY: mapStoreMock.gridOffsetY,
      });

      renderMenu();
      await fireEvent.click(screen.getByRole("menuitem", { name: "Resize" }));
      await fireEvent.click(screen.getByRole("menuitem", { name: "1x1" }));

      expect(mapSessionMock.updateToken).toHaveBeenCalledOnce();
      const [oneByOneTokenId, oneByOneUpdate] =
        mapSessionMock.updateToken.mock.calls[0];
      expect(oneByOneTokenId).toBe("token-1");
      expect(oneByOneUpdate.width).toBeCloseTo(width / 2);
      expect(oneByOneUpdate.height).toBeCloseTo(height / 2);
      expect(oneByOneUpdate.x + oneByOneUpdate.width / 2).toBeCloseTo(
        snappedCentre.x,
      );
      expect(oneByOneUpdate.y + oneByOneUpdate.height / 2).toBeCloseTo(
        snappedCentre.y,
      );

      await fireEvent.click(screen.getByRole("menuitem", { name: "Resize" }));
      await fireEvent.click(screen.getByRole("menuitem", { name: "2x2" }));

      expect(mapSessionMock.updateToken).toHaveBeenCalledTimes(2);
      const [twoByTwoTokenId, twoByTwoUpdate] =
        mapSessionMock.updateToken.mock.calls[1];
      expect(twoByTwoTokenId).toBe("token-1");
      expect(twoByTwoUpdate.width).toBeCloseTo(width);
      expect(twoByTwoUpdate.height).toBeCloseTo(height);
      expect(twoByTwoUpdate.x + twoByTwoUpdate.width / 2).toBeCloseTo(
        snappedCentre.x,
      );
      expect(twoByTwoUpdate.y + twoByTwoUpdate.height / 2).toBeCloseTo(
        snappedCentre.y,
      );
    },
  );

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
