import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Token } from "../../../../types/vtt";
import { getTokenRotationHandlePosition } from "map-engine";
import {
  TokenRotationHandler,
  type TokenRotationDependencies,
} from "./token-rotation-handler";

function createToken(): Token {
  return {
    id: "token-1",
    entityId: null,
    name: "Scout",
    x: 100,
    y: 100,
    width: 50,
    height: 50,
    rotation: 0,
    baseShape: "circle",
    facingIndicator: true,
    zIndex: 0,
    ownerPeerId: "guest-1",
    ownerGuestName: "Guest",
    visibleTo: "all",
    color: "#fff",
    imageUrl: null,
    statusEffects: [],
  };
}

describe("TokenRotationHandler", () => {
  let token: Token;
  let deps: TokenRotationDependencies;
  let handler: TokenRotationHandler;

  beforeEach(() => {
    token = createToken();
    deps = {
      getSelectedToken: () => token,
      project: (point) => point,
      unproject: (point) => point,
      isHostMode: () => true,
      getPeerId: () => null,
      canMoveToken: () => true,
      rotateToken: vi.fn((_, rotation) => {
        token.rotation = rotation;
      }),
      requestTokenRotation: vi.fn(),
      sendTokenRotation: vi.fn(),
      confirmTokenRotation: vi.fn(),
    };
    handler = new TokenRotationHandler(deps);
  });

  it("rotates a selected token from its handle", () => {
    const handle = getTokenRotationHandlePosition(token);

    expect(handler.begin(handle)).toBe(true);
    expect(handler.move({ x: 175, y: 125 })).toBe(true);
    expect(deps.rotateToken).toHaveBeenCalledWith("token-1", 90);
    expect(handler.end()).toBe(true);
  });

  it("does not begin for a non-handle point or unauthorized token", () => {
    expect(handler.begin({ x: 100, y: 100 })).toBe(false);

    deps.canMoveToken = () => false;
    const handle = getTokenRotationHandlePosition(token);
    expect(handler.begin(handle)).toBe(false);
  });

  it("rotates by fixed 45-degree keyboard steps", () => {
    expect(handler.rotateByStep(1)).toBe(true);
    expect(deps.rotateToken).toHaveBeenCalledWith("token-1", 45);

    token.rotation = 0;
    expect(handler.rotateByStep(-1)).toBe(true);
    expect(deps.rotateToken).toHaveBeenLastCalledWith("token-1", 315);
  });

  it("optimistically rotates guest-owned tokens and sends a request", () => {
    deps.isHostMode = () => false;
    deps.getPeerId = () => "guest-1";
    const handle = getTokenRotationHandlePosition(token);

    expect(handler.begin(handle)).toBe(true);
    handler.move({ x: 125, y: 175 });

    expect(deps.requestTokenRotation).toHaveBeenCalledWith(
      "token-1",
      180,
      true,
    );
    expect(deps.sendTokenRotation).toHaveBeenCalledWith("token-1", 180);
    handler.end();
    expect(deps.confirmTokenRotation).toHaveBeenCalledWith("token-1");
  });
});
