import type { MapPin, ViewportTransform } from "schema";
import { imageToViewport } from "./math";
import { TAU, measureTextCached } from "./render-cache";
import {
  drawFacingIndicator,
  drawHealthBar,
  drawRotationHandle,
  drawRoundedRectPath,
  traceTokenShape,
} from "./render-token-overlays";
import { drawCollapsedNote, drawNoteFace } from "./render-notes";
import { drawStatusEffects } from "./token-status-icons";
import { TOKEN_ROTATION_HANDLE_DISTANCE } from "./token-geometry";
import type { CanvasCache, RenderToken } from "./renderer-types";

// Reusable scratch points to minimize GC pressure during animation frames
const scratchPinPos = { x: 0, y: 0 };
const scratchTokenPt = { x: 0, y: 0 };
const scratchTokenTopLeft = { x: 0, y: 0 };
const scratchTokenBottomRight = { x: 0, y: 0 };
const scratchTokenCenter = { x: 0, y: 0 };

export function drawPins(
  ctx: CanvasRenderingContext2D,
  pins: MapPin[],
  transform: ViewportTransform,
  canvasSize: { width: number; height: number },
) {
  for (const pin of pins) {
    const pos = imageToViewport(
      pin.coordinates,
      transform,
      canvasSize,
      scratchPinPos,
    );

    // Frustum culling: skip pins outside the viewport (with padding)
    if (
      pos.x < -20 ||
      pos.x > canvasSize.width + 20 ||
      pos.y < -20 ||
      pos.y > canvasSize.height + 20
    ) {
      continue;
    }

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8, 0, TAU);
    ctx.fillStyle = pin.visuals.color || "#4ade80"; // Fallback to theme-primary
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function drawTokens(
  ctx: CanvasRenderingContext2D,
  tokens: RenderToken[],
  transform: ViewportTransform,
  canvasSize: { width: number; height: number },
  accentColor: string | undefined,
  cache: CanvasCache,
) {
  for (const token of tokens) {
    if (token.visible === false) continue;

    scratchTokenPt.x = token.x;
    scratchTokenPt.y = token.y;
    const topLeft = imageToViewport(
      scratchTokenPt,
      transform,
      canvasSize,
      scratchTokenTopLeft,
    );
    scratchTokenPt.x = token.x + token.width;
    scratchTokenPt.y = token.y + token.height;
    const bottomRight = imageToViewport(
      scratchTokenPt,
      transform,
      canvasSize,
      scratchTokenBottomRight,
    );

    const minX = Math.min(topLeft.x, bottomRight.x);
    const minY = Math.min(topLeft.y, bottomRight.y);
    const width = Math.abs(bottomRight.x - topLeft.x);
    const height = Math.abs(bottomRight.y - topLeft.y);

    if (
      minX > canvasSize.width + 40 ||
      minY > canvasSize.height + 40 ||
      minX + width < -40 ||
      minY + height < -40
    ) {
      continue;
    }

    const center = scratchTokenCenter;
    center.x = minX + width / 2;
    center.y = minY + height / 2;
    drawToken(
      ctx,
      token,
      center,
      width,
      height,
      transform.zoom,
      accentColor,
      cache,
    );
  }
}

function drawToken(
  ctx: CanvasRenderingContext2D,
  token: RenderToken,
  center: { x: number; y: number },
  width: number,
  height: number,
  zoom: number,
  accentColor: string | undefined,
  cache: CanvasCache,
) {
  const diameter = Math.max(1, Math.min(width, height));
  const radius = diameter / 2;
  const shape = token.baseShape ?? "circle";

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate((token.rotation * Math.PI) / 180);
  traceTokenShape(ctx, shape, width, height);
  ctx.clip();
  drawTokenFill(ctx, token, width, height, diameter, cache);
  ctx.restore();

  drawSelectionRing(
    ctx,
    token,
    center,
    width,
    height,
    radius,
    shape,
    accentColor,
  );
  drawVisionRing(ctx, token, center, width, height, shape);
  if (token.facingIndicator) {
    ctx.save();
    ctx.translate(center.x, center.y);
    drawFacingIndicator(ctx, radius, token.rotation);
    ctx.restore();
  }

  if (token.primarySelected ?? token.selected) {
    drawRotationHandle(
      ctx,
      center.x,
      center.y,
      width,
      height,
      token.rotation,
      accentColor || "#3b82f6",
      TOKEN_ROTATION_HANDLE_DISTANCE * zoom,
    );
  }

  drawStatusEffects(
    ctx,
    traceTokenShape,
    center,
    token.rotation,
    shape,
    width,
    height,
    radius,
    token.statusEffects,
  );
  const healthBarHeight =
    token.healthBar && token.healthBar.max > 0
      ? drawHealthBar(ctx, center, width, radius, token.healthBar)
      : 0;
  drawTokenLabel(ctx, token, center, height, healthBarHeight, cache);
}

function drawTokenFill(
  ctx: CanvasRenderingContext2D,
  token: RenderToken,
  width: number,
  height: number,
  diameter: number,
  cache: CanvasCache,
) {
  if (token.kind === "note") {
    drawNoteTokenFill(ctx, token, width, height, cache);
    return;
  }

  if (!token.image || token.image.width <= 0 || token.image.height <= 0) {
    ctx.fillStyle = token.color || "#f59e0b";
    ctx.fill();
    return;
  }

  drawImageTokenFill(ctx, token, token.image, diameter);
}

function drawNoteTokenFill(
  ctx: CanvasRenderingContext2D,
  token: RenderToken,
  width: number,
  height: number,
  cache: CanvasCache,
) {
  if (token.noteCollapsed) {
    drawCollapsedNote(ctx, width, height, token.color || "#f5b942");
    return;
  }
  drawNoteFace(
    ctx,
    width,
    height,
    token.color || "#f5b942",
    token.noteBody ?? "",
    cache,
  );
}

function drawImageTokenFill(
  ctx: CanvasRenderingContext2D,
  token: RenderToken,
  image: HTMLImageElement,
  diameter: number,
) {
  const imageAspect = image.width / image.height;
  const drawWidth = imageAspect > 1 ? diameter * imageAspect : diameter;
  const drawHeight = imageAspect > 1 ? diameter : diameter / imageAspect;
  const offset = getImageOffset(
    token.imageFocus,
    diameter,
    drawWidth,
    drawHeight,
  );
  ctx.drawImage(image, offset.x, offset.y, drawWidth, drawHeight);
}

function getImageOffset(
  focus: RenderToken["imageFocus"],
  diameter: number,
  drawWidth: number,
  drawHeight: number,
) {
  const offset = { x: -drawWidth / 2, y: -drawHeight / 2 };
  switch (focus) {
    case "left":
      offset.x = -diameter / 2;
      break;
    case "right":
      offset.x = diameter / 2 - drawWidth;
      break;
    case "top":
      offset.y = -diameter / 2;
      break;
    case "bottom":
      offset.y = diameter / 2 - drawHeight;
      break;
  }
  return offset;
}

function drawSelectionRing(
  ctx: CanvasRenderingContext2D,
  token: RenderToken,
  center: { x: number; y: number },
  width: number,
  height: number,
  radius: number,
  shape: NonNullable<RenderToken["baseShape"]>,
  accentColor: string | undefined,
) {
  if (!token.active && !token.selected) return;

  const accent = token.active ? accentColor || "#d97706" : "#3b82f6";
  const baseBorderWidth = token.active ? 8 : 5;
  const borderWidth = Math.min(baseBorderWidth, Math.max(2, radius * 0.25));
  const highlightWidth = Math.min(2, Math.max(1, radius * 0.08));
  const blurScale = Math.min(1, radius / 25);

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate((token.rotation * Math.PI) / 180);
  traceTokenShape(ctx, shape, width + borderWidth, height + borderWidth);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = borderWidth + 4;
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = (token.active ? 20 : 12) * blurScale;
  ctx.stroke();

  traceTokenShape(ctx, shape, width, height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = borderWidth;
  ctx.shadowColor = accent;
  ctx.shadowBlur = (token.active ? 16 : 10) * blurScale;
  ctx.stroke();

  traceTokenShape(ctx, shape, width, height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.lineWidth = highlightWidth;
  ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
  ctx.shadowBlur = 4 * blurScale;
  ctx.stroke();
  ctx.restore();
}

function drawVisionRing(
  ctx: CanvasRenderingContext2D,
  token: RenderToken,
  center: { x: number; y: number },
  width: number,
  height: number,
  shape: NonNullable<RenderToken["baseShape"]>,
) {
  if (!token.visionActive) return;
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate((token.rotation * Math.PI) / 180);
  traceTokenShape(ctx, shape, width + 10, height + 10);
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();
}

function drawTokenLabel(
  ctx: CanvasRenderingContext2D,
  token: RenderToken,
  center: { x: number; y: number },
  height: number,
  healthBarHeight: number,
  cache: CanvasCache,
) {
  if (!token.label) return;
  ctx.save();
  const font = "12px ui-sans-serif, system-ui, sans-serif";
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const labelX = center.x;
  const labelY =
    center.y + height / 2 + 6 + (healthBarHeight > 0 ? healthBarHeight + 4 : 0);
  const metrics = measureTextCached(ctx, token.label, font, cache);
  const boxWidth = metrics.width + 16;
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.strokeStyle = token.active ? "#f59e0b" : "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  drawRoundedRectPath(ctx, labelX - boxWidth / 2, labelY, boxWidth, 18, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(token.label, labelX, labelY + 2);
  ctx.restore();
}
