import { beforeEach, describe, expect, it, vi } from "vitest";
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
  const tokens = [token({ id: "token-a", x: 10, y: 20 })];
  let isHost = true;
  let canMoveToken: ReturnType<typeof vi.fn>;
  let moveToken: ReturnType<typeof vi.fn>;
  let requestTokenMove: ReturnType<typeof vi.fn>;
  let sendTokenMoveRequest: ReturnType<typeof vi.fn>;
  let confirmTokenMove: ReturnType<typeof vi.fn>;
  let setDraggingTokenId: ReturnType<typeof vi.fn>;
  let handler: TokenDragHandler;

  beforeEach(() => {
    isHost = true;
    canMoveToken = vi.fn(() => true);
    moveToken = vi.fn();
    requestTokenMove = vi.fn();
    sendTokenMoveRequest = vi.fn();
    confirmTokenMove = vi.fn();
    setDraggingTokenId = vi.fn();
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
    } as any);
  });

  it("starts dragging a movable token and records the image-space offset", () => {
    const hit = handler.begin({ x: 20, y: 30 });

    expect(hit?.id).toBe("token-a");
    expect(handler.dragState).toEqual({
      tokenId: "token-a",
      offset: { x: 10, y: 10 },
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
    expect(handler.end()).toBe(true);

    expect(confirmTokenMove).toHaveBeenCalledWith("token-a");
    expect(setDraggingTokenId).toHaveBeenLastCalledWith(null);
    expect(handler.dragState).toBeNull();
  });
});
