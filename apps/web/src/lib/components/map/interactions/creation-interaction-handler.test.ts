import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreationInteractionHandler } from "./creation-interaction-handler";

describe("CreationInteractionHandler", () => {
  let vttEnabled = true;
  let canCreateTokens = true;
  let setPendingTokenCoords: ReturnType<typeof vi.fn>;
  let setPendingPinCoords: ReturnType<typeof vi.fn>;
  let handler: CreationInteractionHandler;

  beforeEach(() => {
    vttEnabled = true;
    canCreateTokens = true;
    setPendingTokenCoords = vi.fn();
    setPendingPinCoords = vi.fn();
    handler = new CreationInteractionHandler({
      unproject: (point) => ({ x: point.x + 1, y: point.y + 2 }),
      isVttEnabled: () => vttEnabled,
      canCreateTokens: () => canCreateTokens,
      setPendingTokenCoords,
      setPendingPinCoords,
    });
  });

  it("sets pending token coordinates for VTT host mode", () => {
    expect(handler.handleDoubleClick({ x: 10, y: 20 })).toBe(true);

    expect(setPendingTokenCoords).toHaveBeenCalledWith({ x: 11, y: 22 });
    expect(setPendingPinCoords).not.toHaveBeenCalled();
  });

  it("sets pending pin coordinates outside VTT mode", () => {
    vttEnabled = false;

    expect(handler.handleDoubleClick({ x: 10, y: 20 })).toBe(true);

    expect(setPendingPinCoords).toHaveBeenCalledWith({ x: 11, y: 22 });
    expect(setPendingTokenCoords).not.toHaveBeenCalled();
  });

  it("does nothing for VTT non-host mode", () => {
    canCreateTokens = false;

    expect(handler.handleDoubleClick({ x: 10, y: 20 })).toBe(false);

    expect(setPendingTokenCoords).not.toHaveBeenCalled();
    expect(setPendingPinCoords).not.toHaveBeenCalled();
  });
});
