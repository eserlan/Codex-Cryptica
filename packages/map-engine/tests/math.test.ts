import { describe, it, expect } from "vitest";
import { imageToViewport, viewportToImage } from "../src/math";

describe("Map Engine Math", () => {
  const canvasSize = { width: 800, height: 600 };
  const transform = { pan: { x: 0, y: 0 }, zoom: 1 };

  it("should convert image center to viewport center with zero pan and 1x zoom", () => {
    const imgPoint = { x: 0, y: 0 };
    const vpPoint = imageToViewport(imgPoint, transform, canvasSize);
    expect(vpPoint).toEqual({ x: 400, y: 300 });
  });

  it("should round-trip coordinates", () => {
    const imgPoint = { x: 123, y: -456 };
    const vpPoint = imageToViewport(imgPoint, transform, canvasSize);
    const backToImg = viewportToImage(vpPoint, transform, canvasSize);
    expect(backToImg.x).toBeCloseTo(imgPoint.x);
    expect(backToImg.y).toBeCloseTo(imgPoint.y);
  });

  it("should handle zoom and pan correctly", () => {
    const complexTransform = { pan: { x: 100, y: 50 }, zoom: 2 };
    const imgPoint = { x: 10, y: 10 };
    // (10 * 2) + 100 + 400 = 120
    // (10 * 2) + 50 + 300 = 70
    // Wait, 10*2=20. 20+100+400=520. 20+50+300=370.
    const vpPoint = imageToViewport(imgPoint, complexTransform, canvasSize);
    expect(vpPoint).toEqual({ x: 520, y: 370 });
  });
});
