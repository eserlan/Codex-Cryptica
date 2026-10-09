import { describe, expect, it, vi } from "vitest";
import { drawHexGrid, type HexGridRenderOptions } from "./hex-renderer";

function createCtxMock() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    textAlign: "center",
    textBaseline: "alphabetic",
    font: "",
  } as unknown as CanvasRenderingContext2D;
}

describe("drawHexGrid", () => {
  it("skips rendering when on-screen size is too small (< 3px)", () => {
    const ctx = createCtxMock();
    const transform = { pan: { x: 0, y: 0 }, zoom: 0.01 };
    const canvasSize = { width: 800, height: 600 };
    const grid: HexGridRenderOptions = {
      type: "hex-pointy",
      size: 50, // 50 * 0.01 = 0.5px
      color: "#ffffff",
      opacity: 0.5,
    };

    drawHexGrid(ctx, transform, canvasSize, grid);
    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it("skips rendering when size is zero or negative", () => {
    const ctx = createCtxMock();
    const transform = { pan: { x: 0, y: 0 }, zoom: 1 };
    const canvasSize = { width: 800, height: 600 };
    const grid: HexGridRenderOptions = {
      type: "hex-pointy",
      size: -10,
      color: "#ffffff",
      opacity: 0.5,
    };

    drawHexGrid(ctx, transform, canvasSize, grid);
    expect(ctx.stroke).not.toHaveBeenCalled();
  });

  it("renders pointy-topped hex grid within viewport bounds", () => {
    const ctx = createCtxMock();
    const transform = { pan: { x: 0, y: 0 }, zoom: 1 };
    const canvasSize = { width: 800, height: 600 };
    const grid: HexGridRenderOptions = {
      type: "hex-pointy",
      size: 50,
      color: "#ff0000",
      opacity: 0.8,
      lineWidth: 2,
    };

    drawHexGrid(ctx, transform, canvasSize, grid);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.strokeStyle).toBe("#ff0000");
    expect(ctx.globalAlpha).toBe(0.8);
    // Verified that path was drawn using moveTo and lineTo
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
  });

  it("renders flat-topped hex grid within viewport bounds", () => {
    const ctx = createCtxMock();
    const transform = { pan: { x: 100, y: 50 }, zoom: 1.5 };
    const canvasSize = { width: 800, height: 600 };
    const grid: HexGridRenderOptions = {
      type: "hex-flat",
      size: 40,
      color: "#00ff00",
      opacity: 0.6,
    };

    drawHexGrid(ctx, transform, canvasSize, grid);

    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.strokeStyle).toBe("#00ff00");
    expect(ctx.globalAlpha).toBe(0.6);
  });

  it("uses fixedPan when fixed grid mode is enabled", () => {
    const ctx = createCtxMock();
    const transform = { pan: { x: 500, y: 500 }, zoom: 1 };
    const canvasSize = { width: 800, height: 600 };
    const grid: HexGridRenderOptions = {
      type: "hex-pointy",
      size: 50,
      color: "#ffffff",
      opacity: 0.5,
      fixed: true,
      fixedPan: { x: 0, y: 0 },
    };

    drawHexGrid(ctx, transform, canvasSize, grid);

    expect(ctx.stroke).toHaveBeenCalled();
    // Translation should use fixedPan (0, 0) + canvasSize / 2 = (400, 300), not transform.pan (500, 500)
    expect(ctx.translate).toHaveBeenCalledWith(400, 300);
  });

  it("does not render coordinate labels when showCoordinates is false or omitted", () => {
    const ctx = createCtxMock();
    const transform = { pan: { x: 0, y: 0 }, zoom: 1 };
    const canvasSize = { width: 800, height: 600 };
    const grid: HexGridRenderOptions = {
      type: "hex-pointy",
      size: 60,
      color: "#ffffff",
      opacity: 0.5,
      showCoordinates: false,
    };

    drawHexGrid(ctx, transform, canvasSize, grid);

    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it("suppresses coordinates when zoomed out below threshold (< 25px screen radius)", () => {
    const ctx = createCtxMock();
    // 30 * 0.5 = 15px (< 25px threshold)
    const transform = { pan: { x: 0, y: 0 }, zoom: 0.5 };
    const canvasSize = { width: 800, height: 600 };
    const grid: HexGridRenderOptions = {
      type: "hex-pointy",
      size: 30,
      color: "#ffffff",
      opacity: 0.5,
      showCoordinates: true,
    };

    drawHexGrid(ctx, transform, canvasSize, grid);

    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it("renders formatted coordinate labels when showCoordinates is true and screen radius >= 25px", () => {
    const ctx = createCtxMock();
    const transform = { pan: { x: 0, y: 0 }, zoom: 1 };
    const canvasSize = { width: 400, height: 400 };
    const grid: HexGridRenderOptions = {
      type: "hex-pointy",
      size: 50,
      color: "#ffffff",
      opacity: 0.7,
      showCoordinates: true,
    };

    drawHexGrid(ctx, transform, canvasSize, grid);

    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
    // Check that some coordinate label like "00.00" was rendered
    const textCalls = (ctx.fillText as any).mock.calls;
    const texts = textCalls.map((c: any[]) => c[0]);
    expect(texts.some((t: string) => /^-?\d{2}\.-?\d{2}$/.test(t))).toBe(true);
  });
});
