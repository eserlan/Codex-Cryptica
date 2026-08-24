import type { Point } from "schema";

export function drawFogStroke(
  ctx: CanvasRenderingContext2D,
  size: { width: number; height: number },
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

  const centerX = to.x + size.width / 2;
  const centerY = to.y + size.height / 2;
  const prevX = from.x + size.width / 2;
  const prevY = from.y + size.height / 2;

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
  // isHiding=false: paint white onto the mask (source-over), which marks
  // this area as revealed. isHiding=true is destination-out, which erases
  // existing reveal marks and would re-fog the area — the opposite of what
  // an auto-reveal should do.
  drawFogStroke(ctx, image, radius, center, center, false);
}
