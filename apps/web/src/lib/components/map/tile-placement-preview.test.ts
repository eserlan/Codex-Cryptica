import { describe, expect, it, vi } from "vitest";
import { drawTilePlacementPreview } from "./tile-placement-preview";

function createContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    setLineDash: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    globalAlpha: 1,
    lineWidth: 0,
    strokeStyle: "",
    fillStyle: "",
    font: "",
  } as unknown as CanvasRenderingContext2D;
}

describe("drawTilePlacementPreview", () => {
  it.each([
    { shape: "hex-pointy" as const, firstVertex: [Math.sqrt(3) * 25, 25] },
    { shape: "hex-flat" as const, firstVertex: [50, 0] },
  ])(
    "clips a decoded image to a $shape preview and outlines it",
    ({ shape, firstVertex }) => {
      const ctx = createContext();
      const image = { width: 100, height: 80 } as HTMLImageElement;

      drawTilePlacementPreview(ctx, {
        topLeft: { x: 10, y: 20 },
        size: 100,
        height: 100,
        isHex: true,
        hexShape: shape,
        valid: true,
        image,
        name: "Tile",
        accentColor: "#abc",
      });

      expect(ctx.clip).toHaveBeenCalledOnce();
      expect(ctx.drawImage).toHaveBeenCalledWith(image, -50, -40, 100, 80);
      expect(ctx.moveTo).toHaveBeenNthCalledWith(1, ...firstVertex);
      expect(ctx.moveTo).toHaveBeenCalledTimes(2);
      expect(ctx.stroke).toHaveBeenCalledOnce();
      expect(ctx.fill).not.toHaveBeenCalled();
    },
  );

  it.each([
    { shape: "hex-pointy" as const, firstVertex: [Math.sqrt(3) * 25, 25] },
    { shape: "hex-flat" as const, firstVertex: [50, 0] },
  ])("fills and outlines a $shape placeholder", ({ shape, firstVertex }) => {
    const ctx = createContext();

    drawTilePlacementPreview(ctx, {
      topLeft: { x: 10, y: 20 },
      size: 100,
      height: 100,
      isHex: true,
      hexShape: shape,
      valid: false,
      image: null,
      name: "Tile",
      accentColor: "#abc",
    });

    expect(ctx.clip).toHaveBeenCalledOnce();
    expect(ctx.fill).toHaveBeenCalledOnce();
    expect(ctx.drawImage).not.toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenNthCalledWith(1, ...firstVertex);
    expect(ctx.moveTo).toHaveBeenCalledTimes(2);
    expect(ctx.stroke).toHaveBeenCalledOnce();
    expect(ctx.fillStyle).toBe("#ef4444");
  });
});
