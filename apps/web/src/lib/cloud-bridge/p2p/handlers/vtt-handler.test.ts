import { describe, it, expect, vi, beforeEach } from "vitest";
import { VTTHandler } from "./vtt-handler";

describe("VTTHandler", () => {
  let handler: VTTHandler;
  let mockContext: any;
  let mockConn: any;

  beforeEach(() => {
    handler = new VTTHandler();
    mockContext = {
      mapSession: {
        addToken: vi.fn(),
        moveToken: vi.fn(),
        canMoveToken: vi.fn().mockReturnValue(true),
        remoteSelection: {},
        handleRemoteChatMessage: vi.fn(),
        handleRemotePing: vi.fn(),
        handleRemoteMeasurement: vi.fn(),
      },
      transport: { broadcast: vi.fn() },
      vault: { entities: {} },
      guestStore: { guestRoster: {} },
    };
    mockConn = { peer: "g1", send: vi.fn() };
  });

  it("should handle TOKEN_MOVE", async () => {
    const msg = { type: "TOKEN_MOVE", tokenId: "t1", x: 10, y: 10 } as any;
    await handler.handle(msg, mockConn, mockContext);

    expect(mockContext.mapSession.moveToken).toHaveBeenCalledWith(
      "t1",
      10,
      10,
      true,
    );
    expect(mockContext.transport.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TOKEN_STATE_UPDATE" }),
      "g1",
    );
  });

  it("should handle PING", async () => {
    const msg = { type: "PING", x: 5, y: 5, color: "red" } as any;
    await handler.handle(msg, mockConn, mockContext);

    expect(mockContext.mapSession.handleRemotePing).toHaveBeenCalled();
    expect(mockContext.transport.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "MAP_PING" }),
      "g1",
    );
  });
});
