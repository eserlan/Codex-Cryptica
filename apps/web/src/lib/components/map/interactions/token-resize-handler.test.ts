import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Token } from "../../../../types/vtt";
import { TokenResizeHandler } from "./token-resize-handler";
import { TokenSelectionManager } from "./token-selection-manager";

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

describe("TokenResizeHandler", () => {
  let tokens: Token[];
  let updateToken: ReturnType<typeof vi.fn>;
  let handler: TokenResizeHandler;

  beforeEach(() => {
    tokens = [token({ id: "token-a", x: 10, y: 10, width: 50, height: 50 })];
    updateToken = vi.fn();
    const tokenSelection = new TokenSelectionManager({
      getTokens: () => tokens,
      project: (point: { x: number; y: number }) => point,
      getSelectedTokens: () => new Set(),
      setSelection: vi.fn(),
      addToSelection: vi.fn(),
      removeFromSelection: vi.fn(),
      setMultiSelection: vi.fn(),
    } as any);
    handler = new TokenResizeHandler({
      tokenSelection,
      getGridSize: () => 50,
      updateToken,
    } as any);
  });

  it("resizes the token under the pointer by one grid step", () => {
    expect(handler.resizeAt({ x: 20, y: 20 }, -100)).toBe(true);

    expect(updateToken).toHaveBeenCalledWith("token-a", {
      width: 100,
      height: 100,
    });
  });

  it("returns false when no token is under the pointer", () => {
    expect(handler.resizeAt({ x: 500, y: 500 }, -100)).toBe(false);

    expect(updateToken).not.toHaveBeenCalled();
  });

  it("does not update when the token is already at the minimum scale", () => {
    expect(handler.resizeAt({ x: 20, y: 20 }, 100)).toBe(true);

    expect(updateToken).not.toHaveBeenCalled();
  });
});
