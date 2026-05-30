import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Token } from "../../../../types/vtt";
import { ContextMenuInteractionHandler } from "./context-menu-interaction-handler.svelte";
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

describe("ContextMenuInteractionHandler", () => {
  let vttEnabled = true;
  let handler: ContextMenuInteractionHandler;

  beforeEach(() => {
    const tokenSelection = new TokenSelectionManager({
      getTokens: () => [token({ id: "token-a", x: 10, y: 10 })],
      project: (point) => point,
      getSelectedTokens: () => new Set(),
      setSelection: vi.fn(),
      addToSelection: vi.fn(),
      removeFromSelection: vi.fn(),
      setMultiSelection: vi.fn(),
    });
    vttEnabled = true;
    handler = new ContextMenuInteractionHandler({
      isVttEnabled: () => vttEnabled,
      unproject: (point) => ({ x: point.x + 1, y: point.y + 2 }),
      tokenSelection,
    });
  });

  it("opens a context menu with image coordinates and token hit", () => {
    expect(handler.open({ x: 300, y: 400 }, { x: 20, y: 20 })).toBe(true);

    expect(handler.contextMenu).toEqual({
      x: 300,
      y: 400,
      imgX: 21,
      imgY: 22,
      tokenId: "token-a",
    });
  });

  it("does not open when VTT mode is disabled", () => {
    vttEnabled = false;

    expect(handler.open({ x: 300, y: 400 }, { x: 20, y: 20 })).toBe(false);

    expect(handler.contextMenu).toBeNull();
  });

  it("clears the current context menu", () => {
    handler.open({ x: 300, y: 400 }, { x: 20, y: 20 });

    handler.clear();

    expect(handler.contextMenu).toBeNull();
  });
});
