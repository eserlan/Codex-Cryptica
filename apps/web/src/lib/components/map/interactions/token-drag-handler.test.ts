import { beforeEach, describe, expect, it, vi } from "vitest";
import { hexToPoint } from "map-engine";
import type { Token } from "../../../../types/vtt";
import { TokenDragHandler } from "./token-drag-handler";

function token(input: Partial<Token> & { id: string; x: number; y: number }) {
  return {
    entityId: null,
    name: input.id,
    width: 50,
    height: 50,
    rotation: 0,
    zIndex: 0,
    ownerPeerId: null,
    ownerGuestName: null,
    visibleTo: "all",
    color: "#fff",
    imageUrl: null,
    statusEffects: [],
    ...input,
  } satisfies Token;
}

describe("TokenDragHandler", () => {
  let tokens = [token({ id: "token-a", x: 10, y: 20 })];
  let isHost = true;
  let canMoveToken: ReturnType<typeof vi.fn>;
  let moveToken: ReturnType<typeof vi.fn>;
  let requestTokenMove: ReturnType<typeof vi.fn>;
  let sendTokenMoveRequest: ReturnType<typeof vi.fn>;
  let confirmTokenMove: ReturnType<typeof vi.fn>;
  let setDraggingTokenId: ReturnType<typeof vi.fn>;
  let onMoveSettled: ReturnType<typeof vi.fn>;
  let handler: TokenDragHandler;

  beforeEach(() => {
    isHost = true;
    tokens = [token({ id: "token-a", x: 10, y: 20 })];
    canMoveToken = vi.fn(() => true);
    moveToken = vi.fn((id: string, x: number, y: number) => {
      const movingToken = tokens.find((item) => item.id === id);
      if (movingToken) Object.assign(movingToken, { x, y });
    });
    requestTokenMove = vi.fn();
    sendTokenMoveRequest = vi.fn();
    confirmTokenMove = vi.fn();
    setDraggingTokenId = vi.fn();
    onMoveSettled = vi.fn();
    handler = new TokenDragHandler({
      getTokens: () => tokens,
      project: (point: { x: number; y: number }) => point,
      unproject: (point: { x: number; y: number }) => point,
      isHostMode: () => isHost,
      getPeerId: () => "peer-a",
      canMoveToken,
      moveToken,
      requestTokenMove,
      sendTokenMoveRequest,
      confirmTokenMove,
      setDraggingTokenId,
      onMoveSettled,
    } as any);
  });

  it("starts dragging a movable token and records the image-space offset", () => {
    const hit = handler.begin({ x: 20, y: 30 });

    expect(hit?.id).toBe("token-a");
    expect(handler.dragState).toEqual({
      tokenId: "token-a",
      initialPosition: { x: 10, y: 20 },
      offset: { x: 10, y: 10 },
      startPoint: { x: 20, y: 30 },
      hasMoved: false,
    });
    expect(setDraggingTokenId).toHaveBeenCalledWith("token-a");
  });

  it("does not start dragging when the token is not movable", () => {
    canMoveToken.mockReturnValue(false);

    const hit = handler.begin({ x: 20, y: 30 });

    expect(hit).toBeNull();
    expect(handler.dragState).toBeNull();
    expect(setDraggingTokenId).not.toHaveBeenCalled();
  });

  it("moves host tokens directly", () => {
    handler.begin({ x: 20, y: 30 });
    handler.move({ x: 40, y: 60 });

    expect(moveToken).toHaveBeenCalledWith("token-a", 30, 50);
    expect(requestTokenMove).not.toHaveBeenCalled();
    expect(sendTokenMoveRequest).not.toHaveBeenCalled();
  });

  it("optimistically moves guest tokens and sends a P2P request", () => {
    isHost = false;

    handler.begin({ x: 20, y: 30 });
    handler.move({ x: 40, y: 60 });

    expect(requestTokenMove).toHaveBeenCalledWith("token-a", 30, 50, true);
    expect(sendTokenMoveRequest).toHaveBeenCalledWith("token-a", 30, 50);
    expect(moveToken).not.toHaveBeenCalled();
  });

  it("confirms guest moves on drag end", () => {
    isHost = false;

    handler.begin({ x: 20, y: 30 });
    handler.move({ x: 40, y: 60 });
    expect(handler.end()).toBe(true);

    expect(confirmTokenMove).toHaveBeenCalledWith("token-a");
    expect(setDraggingTokenId).toHaveBeenLastCalledWith(null);
    expect(handler.dragState).toBeNull();
  });

  it("settles a moved token once after drag end but ignores an unmoved drag", () => {
    handler.begin({ x: 20, y: 30 });
    handler.end();
    expect(onMoveSettled).not.toHaveBeenCalled();

    handler.begin({ x: 20, y: 30 });
    handler.move({ x: 40, y: 60 });
    handler.end();
    expect(onMoveSettled).toHaveBeenCalledOnce();
    expect(onMoveSettled).toHaveBeenCalledWith(["token-a"]);
  });

  it("does not settle a drag that snaps back to its starting position", () => {
    const mutableTokens = [token({ id: "token-a", x: 0, y: 0 })];
    handler = new TokenDragHandler({
      getTokens: () => mutableTokens,
      project: (point: { x: number; y: number }) => point,
      unproject: (point: { x: number; y: number }) => point,
      isHostMode: () => true,
      getPeerId: () => "peer-a",
      canMoveToken,
      moveToken: vi.fn((id: string, x: number, y: number) => {
        const movingToken = mutableTokens.find((item) => item.id === id);
        if (movingToken) Object.assign(movingToken, { x, y });
      }),
      requestTokenMove,
      sendTokenMoveRequest,
      confirmTokenMove,
      setDraggingTokenId,
      getGridConfig: () => ({
        enabled: true,
        type: "square",
        size: 50,
        offsetX: 0,
        offsetY: 0,
      }),
      onMoveSettled,
    } as any);

    handler.begin({ x: 5, y: 5 });
    handler.move({ x: 11, y: 5 });
    handler.end();

    expect(mutableTokens[0]).toMatchObject({ x: 0, y: 0 });
    expect(onMoveSettled).not.toHaveBeenCalled();
  });

  it("snaps token to nearest hex center on drag end when hex grid is enabled", () => {
    // Hex size 50, pointy orientation, offset 0, 0
    handler = new TokenDragHandler({
      getTokens: () => [{ ...tokens[0], x: 5, y: 5 }],
      project: (p: any) => p,
      unproject: (p: any) => p,
      isHostMode: () => true,
      getPeerId: () => "peer-a",
      canMoveToken,
      moveToken,
      requestTokenMove,
      sendTokenMoveRequest,
      confirmTokenMove,
      setDraggingTokenId,
      getGridConfig: () => ({
        enabled: true,
        type: "hex-pointy",
        size: 50,
        offsetX: 0,
        offsetY: 0,
      }),
    } as any);

    handler.begin({ x: 5, y: 5 });
    handler.move({ x: 10, y: 10 });
    handler.end();

    // Token should have been snapped to nearest hex center
    expect(moveToken).toHaveBeenCalled();
    const lastCall = (moveToken as any).mock.calls.at(-1);
    expect(lastCall[0]).toBe("token-a");
    // x/y is the top-left corner: the 50x50 token's centre (30, 30) is in the
    // hex centred on (0, 0), so the corner lands half a token up and left.
    expect(lastCall[1]).toBeCloseTo(-25);
    expect(lastCall[2]).toBeCloseTo(-25);
  });

  it.each([
    { name: "small", size: 20 },
    { name: "default", size: 50 },
    { name: "large", size: 150 },
  ])(
    "centres a $name token on the hex it was dropped in, not on its corner",
    ({ size }) => {
      const config = {
        orientation: "pointy" as const,
        size: 100,
        offsetX: 0,
        offsetY: 0,
      };
      // Drop the token's centre a little off the middle of hex (1, 0).
      const target = hexToPoint({ q: 1, r: 0 }, config);
      const dropped = {
        x: target.x + 20 - size / 2,
        y: target.y - 15 - size / 2,
      };
      handler = new TokenDragHandler({
        getTokens: () => [
          { ...tokens[0], ...dropped, width: size, height: size },
        ],
        project: (p: any) => p,
        unproject: (p: any) => p,
        isHostMode: () => true,
        getPeerId: () => "peer-a",
        canMoveToken,
        moveToken,
        requestTokenMove,
        sendTokenMoveRequest,
        confirmTokenMove,
        setDraggingTokenId,
        getGridConfig: () => ({
          enabled: true,
          type: "hex-pointy",
          size: 100,
          offsetX: 0,
          offsetY: 0,
        }),
      } as any);

      handler.begin({ x: dropped.x + 1, y: dropped.y + 1 });
      handler.move({ x: dropped.x + 21, y: dropped.y + 11 });
      handler.end();

      const [, x, y] = (moveToken as any).mock.calls.at(-1);
      expect(x + size / 2).toBeCloseTo(target.x);
      expect(y + size / 2).toBeCloseTo(target.y);
    },
  );

  it("snaps a guest's drag to the hex centre too", () => {
    isHost = false;
    handler = new TokenDragHandler({
      getTokens: () => [{ ...tokens[0], x: 5, y: 5, width: 40, height: 40 }],
      project: (p: any) => p,
      unproject: (p: any) => p,
      isHostMode: () => false,
      getPeerId: () => "peer-a",
      canMoveToken,
      moveToken,
      requestTokenMove,
      sendTokenMoveRequest,
      confirmTokenMove,
      setDraggingTokenId,
      getGridConfig: () => ({
        enabled: true,
        type: "hex-flat",
        size: 50,
        offsetX: 0,
        offsetY: 0,
      }),
    } as any);

    handler.begin({ x: 6, y: 6 });
    handler.move({ x: 16, y: 16 });
    handler.end();

    const call = (sendTokenMoveRequest as any).mock.calls.at(-1);
    expect(call[1] + 20).toBeCloseTo(0);
    expect(call[2] + 20).toBeCloseTo(0);
    expect(moveToken).not.toHaveBeenCalled();
  });

  it("does not snap token when grid is disabled", () => {
    handler = new TokenDragHandler({
      getTokens: () => [{ ...tokens[0], x: 33, y: 44 }],
      project: (p: any) => p,
      unproject: (p: any) => p,
      isHostMode: () => true,
      getPeerId: () => "peer-a",
      canMoveToken,
      moveToken,
      requestTokenMove,
      sendTokenMoveRequest,
      confirmTokenMove,
      setDraggingTokenId,
      getGridConfig: () => ({
        enabled: false,
        type: "hex-pointy",
        size: 50,
        offsetX: 0,
        offsetY: 0,
      }),
    } as any);

    handler.begin({ x: 33, y: 44 });
    handler.end();

    // moveToken not called during end() if grid disabled
    expect(moveToken).not.toHaveBeenCalled();
  });

  it("does not move or snap a token when the pointer only clicks it", () => {
    handler = new TokenDragHandler({
      getTokens: () => [{ ...tokens[0], x: 33, y: 44 }],
      project: (p: any) => p,
      unproject: (p: any) => p,
      isHostMode: () => true,
      getPeerId: () => "peer-a",
      canMoveToken,
      moveToken,
      requestTokenMove,
      sendTokenMoveRequest,
      confirmTokenMove,
      setDraggingTokenId,
      getGridConfig: () => ({
        enabled: true,
        type: "hex-pointy",
        size: 50,
        offsetX: 0,
        offsetY: 0,
      }),
    } as any);

    handler.begin({ x: 33, y: 44 });
    handler.move({ x: 35, y: 45 });
    handler.end();

    expect(moveToken).not.toHaveBeenCalled();
    expect(requestTokenMove).not.toHaveBeenCalled();
    expect(confirmTokenMove).not.toHaveBeenCalled();
  });

  it("begins drag inside hex tile but ignores clicks in bounding box corners", () => {
    const hexTile = token({
      id: "tile-hex-drag",
      kind: "tile",
      baseShape: "hex-pointy",
      x: 0,
      y: 0,
      width: 86.6,
      height: 100,
    });
    const hexHandler = new TokenDragHandler({
      getTokens: () => [hexTile],
      project: (p: any) => p,
      unproject: (p: any) => p,
      isHostMode: () => true,
      getPeerId: () => "peer-a",
      canMoveToken: () => true,
      moveToken,
      requestTokenMove,
      sendTokenMoveRequest,
      confirmTokenMove,
      setDraggingTokenId,
      getGridConfig: () => ({
        enabled: true,
        type: "hex-pointy",
        size: 50,
        offsetX: 0,
        offsetY: 0,
      }),
    } as any);

    // Corner (x=2, y=2) is in bounding box but outside pointy hex
    expect(hexHandler.begin({ x: 2, y: 2 })).toBeNull();
    // Center (x=43.3, y=50) is inside pointy hex
    expect(hexHandler.begin({ x: 43.3, y: 50 })?.id).toBe("tile-hex-drag");
  });
});
