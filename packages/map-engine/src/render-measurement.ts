import type { ViewportTransform } from "schema";
import { imageToViewport } from "./math";
import { drawRoundedRectPath } from "./render-token-overlays";
import { measureTextCached, TAU } from "./render-cache";
import type { CanvasCache, RenderMeasurement } from "./renderer-types";

const scratchStart = { x: 0, y: 0 };
const scratchEnd = { x: 0, y: 0 };

export function drawMeasurement(
  ctx: CanvasRenderingContext2D,
  measurement: RenderMeasurement,
  transform: ViewportTransform,
  canvasSize: { width: number; height: number },
  cache: CanvasCache,
) {
  if (!measurement.active || !measurement.start || !measurement.end) return;

  const start = imageToViewport(
    measurement.start,
    transform,
    canvasSize,
    scratchStart,
  );
  const end = imageToViewport(
    measurement.end,
    transform,
    canvasSize,
    scratchEnd,
  );
  const color = measurement.color || "#22c55e";

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 6]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw arrowhead at end
  const headLength = 12;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 6),
    end.y - headLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 6),
    end.y - headLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(start.x, start.y, 4, 0, TAU);
  ctx.fill();

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const label = measurement.label || "";
  if (label) {
    const font = "bold 12px ui-sans-serif, system-ui, sans-serif";
    ctx.font = font;
    const metrics = measureTextCached(ctx, label, font, cache);
    const paddingX = 12;
    const paddingY = 6;
    const boxWidth = metrics.width + paddingX * 2;
    const boxHeight = 14 + paddingY * 2;

    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    const boxX = midX - boxWidth / 2;
    const boxY = midY - boxHeight - 15; // Shift up from the line

    drawRoundedRectPath(ctx, boxX, boxY, boxWidth, boxHeight, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, midX, boxY + boxHeight / 2 + 1);
  }
  ctx.restore();
}
