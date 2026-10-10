import { TOKEN_ROTATION_HANDLE_RADIUS } from "./token-geometry";
import { TAU } from "./render-cache";

export function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }

  ctx.rect(x, y, width, height);
}

export function traceTokenShape(
  ctx: CanvasRenderingContext2D,
  shape: "circle" | "square",
  width: number,
  height: number,
) {
  ctx.beginPath();
  if (shape === "square") {
    ctx.rect(-width / 2, -height / 2, width, height);
  } else {
    ctx.arc(0, 0, Math.min(width, height) / 2, 0, TAU);
  }
  ctx.closePath();
}

export function drawFacingIndicator(
  ctx: CanvasRenderingContext2D,
  radius: number,
  rotation: number,
) {
  const front = "#22c55e";
  const side = "#f59e0b";
  const rear = "#ef4444";
  const ringRadius = radius + 2;
  const ringWidth = Math.max(3, radius * 0.1);
  const north = -Math.PI / 2;

  ctx.save();
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.lineWidth = ringWidth;
  ctx.lineCap = "butt";
  for (const [color, start, end] of [
    [front, north - Math.PI / 4, north + Math.PI / 4],
    [side, north + Math.PI / 4, north + (3 * Math.PI) / 4],
    [rear, north + (3 * Math.PI) / 4, north + (5 * Math.PI) / 4],
    [side, north + (5 * Math.PI) / 4, north + (7 * Math.PI) / 4],
  ] as const) {
    ctx.beginPath();
    ctx.arc(0, 0, ringRadius, start, end);
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  ctx.fillStyle = front;
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.92);
  ctx.lineTo(-radius * 0.13, -radius * 0.62);
  ctx.lineTo(radius * 0.13, -radius * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Returns the bar's height in image-space so callers can push other overlays
// (e.g. the name label) below it and avoid overlapping.
export function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  tokenWidth: number,
  radius: number,
  bar: { value: number; max: number },
): number {
  const ratio = Math.max(0, Math.min(1, bar.value / bar.max));
  const fillColor =
    ratio >= 0.5 ? "#22c55e" : ratio >= 0.25 ? "#facc15" : "#ef4444";
  const barWidth = tokenWidth;
  const barHeight = Math.max(4, Math.min(7, radius * 0.18));
  const barX = center.x - barWidth / 2;
  const barY = center.y + radius + 4;

  ctx.save();
  drawRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fill();
  if (ratio > 0) {
    drawRoundedRectPath(
      ctx,
      barX,
      barY,
      barWidth * ratio,
      barHeight,
      barHeight / 2,
    );
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  drawRoundedRectPath(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
  ctx.stroke();
  ctx.restore();

  return barHeight;
}

export function drawRotationHandle(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotation: number,
  accentColor: string,
  handleDistance: number,
) {
  const handleX = centerX;
  const handleY = centerY - Math.max(width, height) / 2 - handleDistance;

  ctx.save();
  ctx.strokeStyle = accentColor;
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - Math.max(width, height) / 2);
  ctx.lineTo(handleX, handleY);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(handleX, handleY, TOKEN_ROTATION_HANDLE_RADIUS, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(handleX, handleY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.beginPath();
  ctx.arc(0, 0, 6, -Math.PI / 2, Math.PI);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}
