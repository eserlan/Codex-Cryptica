import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  TokenVisionRevealer,
  type TokenVisionRevealerDeps,
} from "./token-vision-revealer";
import type { Token } from "../../../types/vtt";

function createCanvasMock() {
  const ctx = {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    lineCap: "",
    lineJoin: "",
    lineWidth: 0,
    globalCompositeOperation: "",
    fillStyle: "",
    strokeStyle: "",
  } as any;

  const canvas = {
    width: 100,
    height: 80,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx };
}

function createToken(overrides: Partial<Token> = {}): Token {
  return {
    id: "t1",
    entityId: null,
    name: "PC",
    x: 10,
    y: 20,
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
    isVisionSource: true,
    ...overrides,
  };
}

describe("TokenVisionRevealer", () => {
  let mask: ReturnType<typeof createCanvasMock>;
  let saveMask: TokenVisionRevealerDeps["mapStore"]["saveMask"];
  let mapImage: HTMLImageElement;
  let revealer: TokenVisionRevealer;

  beforeEach(() => {
    mask = createCanvasMock();
    saveMask = vi
      .fn()
      .mockResolvedValue(
        undefined,
      ) as unknown as TokenVisionRevealerDeps["mapStore"]["saveMask"];
    mapImage = { width: 200, height: 100 } as HTMLImageElement;

    revealer = new TokenVisionRevealer({
      mapStore: { activeMapId: "map-1", saveMask },
      getMaskCanvas: () => mask.canvas,
      getMapImage: () => mapImage,
    });
  });

  it("punches a full-strength hole for each vision-source token and saves the mask", async () => {
    const tokens = [createToken({ id: "a" }), createToken({ id: "b", x: 5 })];

    const revealed = await revealer.reveal(tokens, 40);

    expect(revealed).toBe(true);
    expect(mask.ctx.globalCompositeOperation).toBe("source-over");
    expect(mask.ctx.fillStyle).toBe("white");
    expect(mask.ctx.arc).toHaveBeenCalledTimes(2);
    expect(saveMask).toHaveBeenCalledWith(mask.canvas);
  });

  it("does nothing when there are no vision-source tokens", async () => {
    const revealed = await revealer.reveal([], 40);

    expect(revealed).toBe(false);
    expect(saveMask).not.toHaveBeenCalled();
  });

  it("does nothing without an active map, mask canvas, or map image", async () => {
    const tokens = [createToken()];

    const noMap = new TokenVisionRevealer({
      mapStore: { activeMapId: null, saveMask },
      getMaskCanvas: () => mask.canvas,
      getMapImage: () => mapImage,
    });
    expect(await noMap.reveal(tokens, 40)).toBe(false);

    const noMask = new TokenVisionRevealer({
      mapStore: { activeMapId: "map-1", saveMask },
      getMaskCanvas: () => null,
      getMapImage: () => mapImage,
    });
    expect(await noMask.reveal(tokens, 40)).toBe(false);

    const noImage = new TokenVisionRevealer({
      mapStore: { activeMapId: "map-1", saveMask },
      getMaskCanvas: () => mask.canvas,
      getMapImage: () => null,
    });
    expect(await noImage.reveal(tokens, 40)).toBe(false);

    expect(saveMask).not.toHaveBeenCalled();
  });
});
