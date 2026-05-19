import { describe, it, expect, vi, beforeEach } from "vitest";
import { GuestVttHandler } from "./guest-vtt-handler";

describe("GuestVttHandler", () => {
  let handler: GuestVttHandler;
  let mapSession: any;
  let ctx: any;
  const conn = { peer: "host", send: vi.fn(), close: vi.fn() } as any;

  beforeEach(() => {
    handler = new GuestVttHandler();
    mapSession = {
      handleRemoteTokenAdded: vi.fn(),
      handleRemoteTokenUpdate: vi.fn(),
      handleRemoteTokenRemoved: vi.fn(),
      handleRemoteShowTokenImage: vi.fn(),
      handleRemoteTurn: vi.fn(),
      handleRemoteMode: vi.fn(),
      handleRemoteGridSettings: vi.fn(),
      handleRemotePing: vi.fn(),
      handleRemoteMeasurement: vi.fn(),
      handleRemoteFogMask: vi.fn(),
    };
    ctx = { mapSession };
  });

  it("claims VTT realtime message types", () => {
    for (const type of [
      "TOKEN_ADDED",
      "TOKEN_STATE_UPDATE",
      "TOKEN_REMOVED",
      "SHOW_TOKEN_IMAGE",
      "TURN_ADVANCE",
      "SET_MODE",
      "SET_GRID_SETTINGS",
      "MAP_PING",
      "MAP_MEASUREMENT",
      "FOG_REVEAL",
    ]) {
      expect(handler.canHandle({ type } as any)).toBe(true);
    }
    expect(handler.canHandle({ type: "MAP_SYNC" } as any)).toBe(false);
  });

  it("routes TOKEN_ADDED", async () => {
    await handler.handle(
      { type: "TOKEN_ADDED", token: { id: "t1" } } as any,
      conn,
      ctx,
    );
    expect(mapSession.handleRemoteTokenAdded).toHaveBeenCalledWith({
      id: "t1",
    });
  });

  it("routes TOKEN_STATE_UPDATE only with a valid tokenId", async () => {
    await handler.handle(
      { type: "TOKEN_STATE_UPDATE", tokenId: 1, delta: {} } as any,
      conn,
      ctx,
    );
    expect(mapSession.handleRemoteTokenUpdate).not.toHaveBeenCalled();

    await handler.handle(
      { type: "TOKEN_STATE_UPDATE", tokenId: "t1", delta: { x: 1 } } as any,
      conn,
      ctx,
    );
    expect(mapSession.handleRemoteTokenUpdate).toHaveBeenCalledWith("t1", {
      x: 1,
    });
  });

  it("routes SHOW_TOKEN_IMAGE only with a string title", async () => {
    await handler.handle(
      { type: "SHOW_TOKEN_IMAGE", title: null } as any,
      conn,
      ctx,
    );
    expect(mapSession.handleRemoteShowTokenImage).not.toHaveBeenCalled();

    await handler.handle(
      { type: "SHOW_TOKEN_IMAGE", title: "X", imagePath: "img" } as any,
      conn,
      ctx,
    );
    expect(mapSession.handleRemoteShowTokenImage).toHaveBeenCalledWith(
      "X",
      "img",
    );
  });

  it("routes MAP_PING with all positional args", async () => {
    await handler.handle(
      {
        type: "MAP_PING",
        x: 1,
        y: 2,
        peerId: "p",
        color: "#fff",
        timestamp: 100,
      } as any,
      conn,
      ctx,
    );
    expect(mapSession.handleRemotePing).toHaveBeenCalledWith(
      1,
      2,
      "p",
      "#fff",
      100,
    );
  });

  it("routes FOG_REVEAL serializing strokes", async () => {
    await handler.handle(
      { type: "FOG_REVEAL", strokes: [[1, 2]] } as any,
      conn,
      ctx,
    );
    expect(mapSession.handleRemoteFogMask).toHaveBeenCalledWith("[[1,2]]");

    await handler.handle({ type: "FOG_REVEAL" } as any, conn, ctx);
    expect(mapSession.handleRemoteFogMask).toHaveBeenLastCalledWith("[]");
  });
});
