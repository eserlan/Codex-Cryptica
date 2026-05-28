import { beforeEach, describe, expect, it, vi } from "vitest";
import { FogInteractionHandler } from "./fog-interaction-handler";

describe("FogInteractionHandler", () => {
  let painter: any;
  let canPaint = true;
  let shouldBroadcast = true;
  let broadcastFogSync: ReturnType<typeof vi.fn>;
  let handler: FogInteractionHandler;

  beforeEach(() => {
    painter = {
      isPainting: false,
      begin: vi.fn(() => {
        painter.isPainting = true;
      }),
      move: vi.fn(),
      finish: vi.fn(async () => {
        painter.isPainting = false;
        return true;
      }),
    };
    canPaint = true;
    shouldBroadcast = true;
    broadcastFogSync = vi.fn();
    handler = new FogInteractionHandler({
      painter,
      canPaint: () => canPaint,
      shouldBroadcastFogSync: () => shouldBroadcast,
      broadcastFogSync,
    });
  });

  it("starts painting only when allowed", () => {
    canPaint = false;
    expect(handler.begin({ x: 10, y: 20 }, false)).toBe(false);
    expect(painter.begin).not.toHaveBeenCalled();

    canPaint = true;
    expect(handler.begin({ x: 10, y: 20 }, true)).toBe(true);
    expect(painter.begin).toHaveBeenCalledWith({ x: 10, y: 20 }, true);
  });

  it("moves only while painting", () => {
    expect(handler.move({ x: 30, y: 40 }, false)).toBe(false);

    painter.isPainting = true;
    expect(handler.move({ x: 30, y: 40 }, true)).toBe(true);
    expect(painter.move).toHaveBeenCalledWith({ x: 30, y: 40 }, true);
  });

  it("finishes and broadcasts fog sync when required", async () => {
    painter.isPainting = true;

    expect(await handler.finish()).toBe(true);

    expect(painter.finish).toHaveBeenCalled();
    expect(broadcastFogSync).toHaveBeenCalled();
  });
});
