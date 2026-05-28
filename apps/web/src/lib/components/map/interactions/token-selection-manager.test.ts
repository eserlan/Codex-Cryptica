import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Token } from "../../../../types/vtt";
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

describe("TokenSelectionManager", () => {
  const tokens = [
    token({ id: "token-a", x: 10, y: 10, zIndex: 1 }),
    token({ id: "token-b", x: 100, y: 100, zIndex: 2 }),
  ];
  let selectedTokens: Set<string>;
  let setSelection: ReturnType<typeof vi.fn>;
  let addToSelection: ReturnType<typeof vi.fn>;
  let removeFromSelection: ReturnType<typeof vi.fn>;
  let setMultiSelection: ReturnType<typeof vi.fn>;
  let manager: TokenSelectionManager;

  beforeEach(() => {
    selectedTokens = new Set();
    setSelection = vi.fn();
    addToSelection = vi.fn((tokenId: string) => selectedTokens.add(tokenId));
    removeFromSelection = vi.fn((tokenId: string) =>
      selectedTokens.delete(tokenId),
    );
    setMultiSelection = vi.fn();
    manager = new TokenSelectionManager({
      getTokens: () => tokens,
      project: (point) => point,
      getSelectedTokens: () => selectedTokens,
      setSelection,
      addToSelection,
      removeFromSelection,
      setMultiSelection,
    });
  });

  it("selects a token without modifiers", () => {
    manager.applyModifierSelection("token-a", {});

    expect(setSelection).toHaveBeenCalledWith("token-a");
    expect(addToSelection).not.toHaveBeenCalled();
    expect(removeFromSelection).not.toHaveBeenCalled();
  });

  it("adds a token with ctrl or meta without replacing selection", () => {
    manager.applyModifierSelection("token-a", { ctrlKey: true });

    expect(addToSelection).toHaveBeenCalledWith("token-a");
    expect(setSelection).not.toHaveBeenCalled();
  });

  it("toggles a selected token off with shift", () => {
    selectedTokens.add("token-a");

    manager.applyModifierSelection("token-a", { shiftKey: true });

    expect(removeFromSelection).toHaveBeenCalledWith("token-a");
    expect(addToSelection).not.toHaveBeenCalled();
  });

  it("toggles an unselected token on with shift", () => {
    manager.applyModifierSelection("token-a", { shiftKey: true });

    expect(addToSelection).toHaveBeenCalledWith("token-a");
    expect(removeFromSelection).not.toHaveBeenCalled();
  });

  it("selects tokens inside a box only when the box exceeds the area threshold", () => {
    expect(manager.selectWithinBox({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe(false);
    expect(setMultiSelection).not.toHaveBeenCalled();

    expect(manager.selectWithinBox({ x: 0, y: 0 }, { x: 120, y: 120 })).toBe(
      true,
    );
    expect(setMultiSelection).toHaveBeenCalledWith(["token-a", "token-b"]);
  });
});
