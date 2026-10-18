import { describe, expect, it, vi } from "vitest";
import { HexJourneyMovement } from "./hex-journey-movement";
import { MapMoveCoordinator } from "../map-move-coordinator";
import { hexToPoint } from "map-engine";
import type { Token } from "../../../../types/vtt";

const grid = {
  orientation: "pointy" as const,
  size: 20,
  offsetX: 0,
  offsetY: 0,
};
const token = (q: number, r: number): Token => {
  const p = hexToPoint({ q, r }, grid);
  return {
    id: "party",
    x: p.x - 10,
    y: p.y - 10,
    width: 20,
    height: 20,
    isVisionSource: true,
  } as Token;
};

describe("HexJourneyMovement", () => {
  it("moves token centre to the adjacent hex and records/open arrival once", async () => {
    let current = token(0, 0);
    const completeMove = vi.fn(async () => {}),
      explore = vi.fn(async () => ({ newlyExplored: true })),
      openArrival = vi.fn();
    const movement = new HexJourneyMovement({
      coordinator: new MapMoveCoordinator({
        completeObservedMove: vi.fn(async () => {}),
      }),
      getToken: () => current,
      getGrid: () => grid,
      getPermission: () => true,
      moveToken: (_token, x, y) => {
        current = { ...current, x, y };
        return current;
      },
      completeMove,
      explore,
      openArrival,
      getMapId: () => "map-1",
      getRouteIdentity: () => "map-1:v1:grid",
    });
    const result = await movement.step("party", { q: 0, r: 0 }, { q: 1, r: 0 });
    expect(result).toEqual({ moved: true, arrivalSaved: true });
    expect(completeMove).toHaveBeenCalledTimes(1);
    expect(explore).toHaveBeenCalledWith("map-1", { q: 1, r: 0 });
    expect(openArrival).toHaveBeenCalledWith("map-1", { q: 1, r: 0 }, true);
  });

  it("refuses an externally moved, locked or unauthorised token", async () => {
    const current = token(1, 0);
    const movement = new HexJourneyMovement({
      coordinator: new MapMoveCoordinator({
        completeObservedMove: vi.fn(async () => {}),
      }),
      getToken: () => current,
      getGrid: () => grid,
      getPermission: () => false,
      moveToken: vi.fn(),
      completeMove: vi.fn(),
      explore: vi.fn(),
      openArrival: vi.fn(),
      getMapId: () => "map-1",
      getRouteIdentity: () => "map-1:v1:grid",
    });
    expect(
      await movement.step("party", { q: 0, r: 0 }, { q: 1, r: 0 }),
    ).toMatchObject({ moved: false });
  });

  it("can retry a failed arrival write without moving or capturing twice", async () => {
    let current = token(0, 0);
    const moveToken = vi.fn((_token: Token, x: number, y: number) => {
      current = { ...current, x, y };
      return current;
    });
    const completeMove = vi.fn(async () => {});
    const explore = vi
      .fn()
      .mockRejectedValueOnce(new Error("storage unavailable"))
      .mockResolvedValueOnce({ newlyExplored: true });
    const openArrival = vi.fn();
    const movement = new HexJourneyMovement({
      coordinator: new MapMoveCoordinator({
        completeObservedMove: vi.fn(async () => {}),
      }),
      getToken: () => current,
      getGrid: () => grid,
      getPermission: () => true,
      moveToken,
      completeMove,
      explore,
      openArrival,
      getMapId: () => "map-1",
      getRouteIdentity: () => "map-1:v1:grid",
    });
    const first = await movement.step("party", { q: 0, r: 0 }, { q: 1, r: 0 });
    expect(first).toMatchObject({ moved: true, arrivalSaved: false });
    expect(await movement.retryArrival("map-1", { q: 1, r: 0 })).toBe(true);
    expect(moveToken).toHaveBeenCalledTimes(1);
    expect(completeMove).toHaveBeenCalledTimes(1);
    expect(explore).toHaveBeenCalledTimes(2);
    expect(openArrival).toHaveBeenCalledWith("map-1", { q: 1, r: 0 }, true);
  });

  it("does not accept a move that snaps to the wrong hex", async () => {
    const current = token(0, 0);
    const explore = vi.fn();
    const movement = new HexJourneyMovement({
      coordinator: new MapMoveCoordinator({
        completeObservedMove: vi.fn(async () => {}),
      }),
      getToken: () => current,
      getGrid: () => grid,
      getPermission: () => true,
      moveToken: () => current,
      completeMove: vi.fn(),
      explore,
      openArrival: vi.fn(),
      getMapId: () => "map-1",
      getRouteIdentity: () => "map-1:v1:grid",
    });
    expect(
      await movement.step("party", { q: 0, r: 0 }, { q: 1, r: 0 }),
    ).toMatchObject({ moved: false });
    expect(explore).not.toHaveBeenCalled();
  });

  it("rejects missing, locked and non-party tokens before moving", async () => {
    for (const candidate of [
      undefined,
      { ...token(0, 0), locked: true },
      { ...token(0, 0), isVisionSource: false },
    ]) {
      const moveToken = vi.fn();
      const movement = new HexJourneyMovement({
        coordinator: new MapMoveCoordinator({
          completeObservedMove: vi.fn(async () => {}),
        }),
        getToken: () => candidate,
        getGrid: () => grid,
        getPermission: () => true,
        moveToken,
        completeMove: vi.fn(),
        explore: vi.fn(),
        openArrival: vi.fn(),
        getMapId: () => "map-1",
        getRouteIdentity: () => "map-1:v1:grid",
      });
      expect(
        (await movement.step("party", { q: 0, r: 0 }, { q: 1, r: 0 })).moved,
      ).toBe(false);
      expect(moveToken).not.toHaveBeenCalled();
    }
  });

  it("suppresses capture and arrival writes if map identity changes during movement", async () => {
    let current = token(0, 0);
    let identity = "map-1:v1:grid";
    const completeMove = vi.fn();
    const explore = vi.fn();
    const movement = new HexJourneyMovement({
      coordinator: new MapMoveCoordinator({
        completeObservedMove: vi.fn(async () => {}),
      }),
      getToken: () => current,
      getGrid: () => grid,
      getRouteIdentity: () => identity,
      getPermission: () => true,
      moveToken: (_token, x, y) => {
        current = { ...current, x, y };
        identity = "map-2:v1:grid";
        return current;
      },
      completeMove,
      explore,
      openArrival: vi.fn(),
      getMapId: () => "map-1",
    });
    expect(
      await movement.step("party", { q: 0, r: 0 }, { q: 1, r: 0 }),
    ).toMatchObject({ moved: true, arrivalSaved: false });
    expect(completeMove).not.toHaveBeenCalled();
    expect(explore).not.toHaveBeenCalled();
  });
});
