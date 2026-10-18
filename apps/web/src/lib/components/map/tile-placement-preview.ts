import { traceTokenShape } from "map-engine";
import type { Point } from "schema";

export interface TilePlacementPreviewDrawing {
  topLeft: Point;
  size: number;
  height: number;
  isHex: boolean;
  hexShape: "hex-pointy" | "hex-flat";
  valid: boolean;
  image: HTMLImageElement | null;
  name: string;
  accentColor: string;
}

export function drawTilePlacementPreview(
  ctx: CanvasRenderingContext2D,
  preview: TilePlacementPreviewDrawing,
) {
  const {
    topLeft,
    size,
    height,
    isHex,
    hexShape,
    valid,
    image,
    name,
    accentColor,
  } = preview;
  const stroke = valid ? accentColor : "#ef4444";
  const fill = valid ? "rgba(16, 185, 129, 0.18)" : "rgba(239, 68, 68, 0.18)";

  ctx.save();
  ctx.globalAlpha = 0.65;
  ctx.setLineDash([8, 4]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;

  if (isHex) {
    const centerX = topLeft.x + size / 2;
    const centerY = topLeft.y + height / 2;
    ctx.save();
    ctx.translate(centerX, centerY);
    traceTokenShape(ctx, hexShape, size, height);
    ctx.clip();
    if (image) {
      const scale = Math.min(size / image.width, height / image.height);
      const imageWidth = image.width * scale;
      const imageHeight = image.height * scale;
      ctx.drawImage(
        image,
        -imageWidth / 2,
        -imageHeight / 2,
        imageWidth,
        imageHeight,
      );
    } else {
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(centerX, centerY);
    traceTokenShape(ctx, hexShape, size, height);
    ctx.stroke();
    ctx.restore();
  } else {
    if (image) {
      ctx.drawImage(image, topLeft.x, topLeft.y, size, height);
    } else {
      // The placeholder tint should disappear once the image is decoded.
      ctx.fillRect(topLeft.x, topLeft.y, size, height);
    }
    ctx.strokeRect(topLeft.x, topLeft.y, size, height);
  }

  ctx.setLineDash([]);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.font = "600 12px sans-serif";
  ctx.fillText(name, topLeft.x, topLeft.y - 8);
  ctx.restore();
}
