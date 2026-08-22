import type { Point } from "schema";

export function drawFogStroke(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  radius: number,
  from: Point,
  to: Point,
  isHiding: boolean,
) {
  ctx.save();

  if (isHiding) {
    ctx.globalCompositeOperation = "destination-out";
  } else {
    ctx.fillStyle = "white";
    ctx.strokeStyle = "white";
    ctx.globalCompositeOperation = "source-over";
  }

  const centerX = to.x + image.width / 2;
  const centerY = to.y + image.height / 2;
  const prevX = from.x + image.width / 2;
  const prevY = from.y + image.height / 2;

  ctx.beginPath();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = radius * 2;
  ctx.moveTo(prevX, prevY);
  ctx.lineTo(centerX, centerY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function punchFogCircle(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  radius: number,
  center: Point,
) {
  drawFogStroke(ctx, image, radius, center, center, true);
}
