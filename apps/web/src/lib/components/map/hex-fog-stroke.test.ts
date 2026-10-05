import { describe, expect, it, vi } from "vitest";
import { punchHexFogCell, punchHexFogRadius } from "./hex-fog-stroke";
import type { HexGridConfig } from "map-engine";

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
    globalCompositeOperation: "source-over",
  } as unknown as CanvasRenderingContext2D;
}

describe("hex-fog-stroke", () => {
  const config: HexGridConfig = {
    orientation: "pointy",
    size: 50,
    offsetX: 0,
    offsetY: 0,
  };
  const maskSize = { width: 1000, height: 800 };

  describe("punchHexFogCell", () => {
    it("reveals a single hex with source-over and white fill", () => {
      const ctx = createMockCtx();
      punchHexFogCell(ctx, maskSize, { q: 0, r: 0 }, config, false);

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      expect(ctx.fillStyle).toBe("white");
      expect(ctx.globalCompositeOperation).toBe("source-over");
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalledTimes(1);
      expect(ctx.lineTo).toHaveBeenCalledTimes(5);
      expect(ctx.closePath).toHaveBeenCalledTimes(1);
      expect(ctx.fill).toHaveBeenCalledTimes(1);
    });

    it("hides a single hex with destination-out composite operation", () => {
      const ctx = createMockCtx();
      punchHexFogCell(ctx, maskSize, { q: 1, r: -1 }, config, true);

      expect(ctx.globalCompositeOperation).toBe("destination-out");
      expect(ctx.fill).toHaveBeenCalledTimes(1);
    });

    it("applies maskSize center offset to coordinates", () => {
      const ctx = createMockCtx();
      punchHexFogCell(ctx, maskSize, { q: 0, r: 0 }, config, false);

      const moveCall = (ctx.moveTo as any).mock.calls[0];
      // center is (0, 0), with offset (500, 400), vertex should be around (500 + dx, 400 + dy)
      expect(moveCall[0]).toBeCloseTo(500 + 50 * Math.cos(Math.PI / 6));
      expect(moveCall[1]).toBeCloseTo(400 + 50 * Math.sin(Math.PI / 6));
    });
  });

  describe("punchHexFogRadius", () => {
    it("reveals single cell when radius is 0", () => {
      const ctx = createMockCtx();
      punchHexFogRadius(ctx, maskSize, { q: 0, r: 0 }, 0, config, false);

      expect(ctx.fillStyle).toBe("white");
      expect(ctx.moveTo).toHaveBeenCalledTimes(1);
      expect(ctx.closePath).toHaveBeenCalledTimes(1);
      expect(ctx.fill).toHaveBeenCalledTimes(1);
    });

    it("reveals 7 hex cells (center + 6 neighbors) when radius is 1", () => {
      const ctx = createMockCtx();
      punchHexFogRadius(ctx, maskSize, { q: 0, r: 0 }, 1, config, false);

      expect(ctx.moveTo).toHaveBeenCalledTimes(7);
      expect(ctx.closePath).toHaveBeenCalledTimes(7);
      expect(ctx.fill).toHaveBeenCalledTimes(1);
    });

    it("reveals 19 hex cells when radius is 2", () => {
      const ctx = createMockCtx();
      punchHexFogRadius(ctx, maskSize, { q: 0, r: 0 }, 2, config, false);

      expect(ctx.moveTo).toHaveBeenCalledTimes(19);
      expect(ctx.fill).toHaveBeenCalledTimes(1);
    });

    it("hides radius of hexes when isHiding is true", () => {
      const ctx = createMockCtx();
      punchHexFogRadius(ctx, maskSize, { q: 0, r: 0 }, 1, config, true);

      expect(ctx.globalCompositeOperation).toBe("destination-out");
      expect(ctx.fill).toHaveBeenCalledTimes(1);
    });
  });
});
