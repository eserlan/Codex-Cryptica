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
    const diameter = Math.max(1, Math.min(width, height));
    const radius = diameter / 2;
    const shape = token.baseShape ?? "circle";

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate((token.rotation * Math.PI) / 180);

    traceTokenShape(ctx, shape, width, height);
    ctx.clip();

    if (token.kind === "note") {
      if (token.noteCollapsed) {
        drawCollapsedNote(ctx, width, height, token.color || "#f5b942");
      } else {
        drawNoteFace(
          ctx,
          width,
          height,
          token.color || "#f5b942",
          token.noteBody ?? "",
          cache,
        );
      }
    } else if (token.image && token.image.width > 0 && token.image.height > 0) {
      const imageAspect = token.image.width / token.image.height;
      const drawWidth = imageAspect > 1 ? diameter * imageAspect : diameter;
      const drawHeight = imageAspect > 1 ? diameter : diameter / imageAspect;

      // Cover-fit crops whichever axis overflows the token's diameter. By
      // default that crop is centered (equal amounts trimmed off both
      // sides) — imageFocus instead pins one edge of the image to the
      // token's edge, so e.g. a portrait whose subject sits near the top
      // doesn't get its head cropped off by a symmetric center-crop.
      let offsetX = -drawWidth / 2;
      let offsetY = -drawHeight / 2;
      switch (token.imageFocus) {
        case "left":
          offsetX = -diameter / 2;
          break;
        case "right":
          offsetX = diameter / 2 - drawWidth;
          break;
        case "top":
          offsetY = -diameter / 2;
          break;
        case "bottom":
          offsetY = diameter / 2 - drawHeight;
          break;
      }

      ctx.drawImage(token.image, offsetX, offsetY, drawWidth, drawHeight);
    } else if (token.image) {
      ctx.fillStyle = token.color || "#f59e0b";
      ctx.fill();
    } else {
      ctx.fillStyle = token.color || "#f59e0b";
      ctx.fill();
    }

    ctx.restore();

    // Border and shadow OUTSIDE the token (grouped to minimise save/restore thrash)
    if (token.active || token.selected) {
      const accent = token.active ? accentColor || "#d97706" : "#3b82f6";
      // Scale the selection ring relative to the token's own size instead of
      // a fixed pixel width — a border sized for a typical ~100px token
      // would visually swallow a much smaller one (e.g. a token sized to a
      // grid fit to a tile's fine native pixel grid), making an otherwise
      // correctly-sized token look like it oversteps its cell.
      const baseBorderWidth = token.active ? 8 : 5;
      const borderWidth = Math.min(baseBorderWidth, Math.max(2, radius * 0.25));
      const highlightWidth = Math.min(2, Math.max(1, radius * 0.08));
      const blurScale = Math.min(1, radius / 25);

      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate((token.rotation * Math.PI) / 180);

      // Outer drop shadow (outside only)
      traceTokenShape(ctx, shape, width + borderWidth, height + borderWidth);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = borderWidth + 4;
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = (token.active ? 20 : 12) * blurScale;
      ctx.stroke();

      // Main thick border
      traceTokenShape(ctx, shape, width, height);
      ctx.strokeStyle = accent;
      ctx.lineWidth = borderWidth;
      ctx.shadowColor = accent;
      ctx.shadowBlur = (token.active ? 16 : 10) * blurScale;
      ctx.stroke();

      // Thin bright highlight on top
      traceTokenShape(ctx, shape, width, height);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = highlightWidth;
      ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
      ctx.shadowBlur = 4 * blurScale;
      ctx.stroke();

      ctx.restore();
    }

    if (token.visionActive) {
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
        TOKEN_ROTATION_HANDLE_DISTANCE * transform.zoom,
      );
    }

    // Draw status effect overlays: the dead X overlay (if present) and the
    // floating icon bar for everything else.
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

    let healthBarHeight = 0;
    if (token.healthBar && token.healthBar.max > 0) {
      healthBarHeight = drawHealthBar(
        ctx,
        center,
        width,
        radius,
        token.healthBar,
      );
    }

    if (token.label) {
      ctx.save();
      const font = "12px ui-sans-serif, system-ui, sans-serif";
      ctx.font = font;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const labelX = center.x;
      const labelY =
        center.y +
        height / 2 +
        6 +
        (healthBarHeight > 0 ? healthBarHeight + 4 : 0);
      const metrics = measureTextCached(ctx, token.label, font, cache);
      const paddingX = 8;
      const boxWidth = metrics.width + paddingX * 2;
      const boxHeight = 18;
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.strokeStyle = token.active ? "#f59e0b" : "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      drawRoundedRectPath(
        ctx,
        labelX - boxWidth / 2,
        labelY,
        boxWidth,
        boxHeight,
        8,
      );
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(token.label, labelX, labelY + 2);
      ctx.restore();
    }
  }
}
