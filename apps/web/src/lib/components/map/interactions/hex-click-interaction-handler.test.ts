import { describe, expect, it, vi } from "vitest";
import {
  HexClickInteractionHandler,
  type HexClickState,
} from "./hex-click-interaction-handler";

const OPEN_STATE: HexClickState = {
  canSeeHexCrawl: true,
  enabled: true,
  isHexGrid: true,
  mapId: "map-1",
  blocked: false,
};

const HEX = { q: 2, r: -1 };

function setup(state: Partial<HexClickState> = {}) {
  const openHex = vi.fn();
  const hexAt = vi.fn(() => HEX);
  const handler = new HexClickInteractionHandler({
    readState: () => ({ ...OPEN_STATE, ...state }),
    hexAt,
    openHex,
  });
  return { handler, openHex, hexAt };
}

const still = {
  start: { x: 100, y: 100 },
  end: { x: 102, y: 101 },
  altKey: false,
};

describe("HexClickInteractionHandler", () => {
  it("opens the hex under the press when the pointer barely moved", () => {
    const { handler, openHex, hexAt } = setup();

    expect(handler.handle(still)).toBe(true);
    expect(hexAt).toHaveBeenCalledWith({ x: 100, y: 100 });
    expect(openHex).toHaveBeenCalledWith("map-1", HEX);
  });

  it("does nothing when the pointer moved 5px or more (a pan)", () => {
    const { handler, openHex } = setup();

    expect(
      handler.handle({
        start: { x: 0, y: 0 },
        end: { x: 3, y: 4 },
        altKey: false,
      }),
    ).toBe(false);
    expect(
      handler.handle({
        start: { x: 0, y: 0 },
        end: { x: 6, y: 0 },
        altKey: false,
      }),
    ).toBe(false);
    expect(openHex).not.toHaveBeenCalled();
  });

  it.each([
    ["Alt is held (fog painting)", { altKey: true }],
    [
      "grid move, fit, placement or measurement is in progress",
      { blocked: true },
    ],
    ["the viewer is a guest or a connected player", { canSeeHexCrawl: false }],
    ["Hex Crawl mode is off", { enabled: false }],
    ["the map uses a square grid", { isHexGrid: false }],
    ["no map is active", { mapId: null }],
  ])("does nothing when %s", (_label, change) => {
    const { handler, openHex } = setup(change as Partial<HexClickState>);

    const gesture = {
      ...still,
      altKey: (change as { altKey?: boolean }).altKey === true,
    };
    expect(handler.handle(gesture)).toBe(false);
    expect(openHex).not.toHaveBeenCalled();
  });
});
