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

  it("opens for a note even when VTT mode is disabled", () => {
    const tokenSelection = new TokenSelectionManager({
      getTokens: () => [token({ id: "note-a", x: 10, y: 10, kind: "note" })],
      project: (point) => point,
      getSelectedTokens: () => new Set(),
      setSelection: vi.fn(),
      addToSelection: vi.fn(),
      removeFromSelection: vi.fn(),
      setMultiSelection: vi.fn(),
    });
    const noteHandler = new ContextMenuInteractionHandler({
      isVttEnabled: () => false,
      unproject: (point) => ({ x: point.x + 1, y: point.y + 2 }),
      tokenSelection,
    });

    expect(noteHandler.open({ x: 300, y: 400 }, { x: 20, y: 20 })).toBe(true);
    expect(noteHandler.contextMenu?.tokenId).toBe("note-a");
  });

  it("clears the current context menu", () => {
    handler.open({ x: 300, y: 400 }, { x: 20, y: 20 });

    handler.clear();

    expect(handler.contextMenu).toBeNull();
  });

  describe("fog hex target", () => {
    function withHexTarget(
      target: { hex: { q: number; r: number }; fogged: boolean } | null,
    ) {
      return new ContextMenuInteractionHandler({
        isVttEnabled: () => vttEnabled,
        unproject: (point) => point,
        tokenSelection: new TokenSelectionManager({
          getTokens: () => [token({ id: "token-a", x: 10, y: 10 })],
          project: (point) => point,
          getSelectedTokens: () => new Set(),
          setSelection: vi.fn(),
          addToSelection: vi.fn(),
          removeFromSelection: vi.fn(),
          setMultiSelection: vi.fn(),
        }),
        getFogHexTarget: () => target,
      });
    }

    it("carries the empty hex under the cursor", () => {
      const hexHandler = withHexTarget({ hex: { q: 2, r: -1 }, fogged: true });

      expect(hexHandler.open({ x: 1, y: 1 }, { x: 300, y: 300 })).toBe(true);
      expect(hexHandler.contextMenu?.hex).toEqual({
        q: 2,
        r: -1,
        fogged: true,
      });
    });

    it("opens for a hex even with play off", () => {
      vttEnabled = false;
      const hexHandler = withHexTarget({ hex: { q: 0, r: 0 }, fogged: false });

      expect(hexHandler.open({ x: 1, y: 1 }, { x: 300, y: 300 })).toBe(true);
    });

    it("does not offer a hex when a token is under the cursor", () => {
      const hexHandler = withHexTarget({ hex: { q: 0, r: 0 }, fogged: true });

      expect(hexHandler.open({ x: 1, y: 1 }, { x: 20, y: 20 })).toBe(true);
      expect(hexHandler.contextMenu?.hex).toBeUndefined();
    });

    it("stays closed with play off and no hex target", () => {
      vttEnabled = false;

      expect(withHexTarget(null).open({ x: 1, y: 1 }, { x: 300, y: 300 })).toBe(
        false,
      );
    });
  });
});
