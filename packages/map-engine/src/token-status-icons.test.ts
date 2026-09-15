import { describe, expect, it, vi } from "vitest";
import { drawStatusEffects, drawStatusIconBar } from "./token-status-icons";

function createCtxMock() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    rect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineCap: "butt",
    lineJoin: "miter",
    shadowColor: "",
    shadowBlur: 0,
  } as unknown as CanvasRenderingContext2D;
}

const traceShape = vi.fn();
const center = { x: 100, y: 100 };

describe("drawStatusEffects", () => {
  it("does nothing when there are no status effects", () => {
    const ctx = createCtxMock();

    drawStatusEffects(
      ctx,
      traceShape,
      center,
      0,
      "circle",
      50,
      50,
      25,
      undefined,
    );
    drawStatusEffects(ctx, traceShape, center, 0, "circle", 50, 50, 25, []);

    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.fill).not.toHaveBeenCalled();
  });

  it("draws the dead X overlay but no icon bar when only 'dead' is present", () => {
    const ctx = createCtxMock();

    drawStatusEffects(ctx, traceShape, center, 0, "circle", 50, 50, 25, [
      "dead",
    ]);

    // Dead overlay: fills the shape, then strokes the red X.
    expect(ctx.fillStyle).toBe("rgba(0, 0, 0, 0.5)");
    expect(ctx.strokeStyle).toBe("#ef4444");
    expect(ctx.stroke).toHaveBeenCalledTimes(1);
    // No icon bar drawn since "dead" is filtered out of the icon list.
    expect(ctx.rect).not.toHaveBeenCalled();
  });

  it("draws the icon bar (and skips the dead overlay) for non-dead statuses", () => {
    const ctx = createCtxMock();

    drawStatusEffects(ctx, traceShape, center, 0, "circle", 50, 50, 25, [
      "stunned",
      "poisoned",
    ]);

    expect(ctx.rect).toHaveBeenCalled();
    // Only the icon bar's pill background stroke + poisoned's flask stroke —
    // never the dead overlay's red-X path.
    expect(ctx.strokeStyle).not.toBe("#ef4444");
  });
});

describe("drawStatusIconBar", () => {
  it("filters out 'dead' and no-ops when nothing else is present", () => {
    const ctx = createCtxMock();

    drawStatusIconBar(ctx, center, 25, ["dead"]);

    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.rect).not.toHaveBeenCalled();
  });

  it("draws one icon per non-dead status", () => {
    const ctx = createCtxMock();

    drawStatusIconBar(ctx, center, 25, ["dead", "stunned", "invisible"]);

    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
    expect(ctx.rect).toHaveBeenCalledTimes(1);
    // stunned uses quadraticCurveTo-free fill; invisible's eye shape does —
    // confirms both branches ran rather than just the first status.
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
  });
});
