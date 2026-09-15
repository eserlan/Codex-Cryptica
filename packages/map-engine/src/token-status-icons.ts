const TAU = Math.PI * 2;

export type TraceTokenShape = (
  ctx: CanvasRenderingContext2D,
  shape: "circle" | "square",
  width: number,
  height: number,
) => void;

/**
 * Dark overlay + red X drawn directly on a dead token, distinguishing it at a
 * glance from the smaller status icon bar (which floats above the token
 * instead of covering it).
 */
export function drawDeadOverlay(
  ctx: CanvasRenderingContext2D,
  traceShape: TraceTokenShape,
  center: { x: number; y: number },
  rotation: number,
  shape: "circle" | "square",
  width: number,
  height: number,
  radius: number,
) {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate((rotation * Math.PI) / 180);
  traceShape(ctx, shape, width, height);
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fill();
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = Math.max(3, radius * 0.15);
  ctx.lineCap = "round";
  ctx.shadowColor = "rgba(239, 68, 68, 0.8)";
  ctx.shadowBlur = 8;
  const xHalf = radius * 0.5;
  ctx.beginPath();
  ctx.moveTo(-xHalf, -xHalf);
  ctx.lineTo(xHalf, xHalf);
  ctx.moveTo(xHalf, -xHalf);
  ctx.lineTo(-xHalf, xHalf);
  ctx.stroke();
  ctx.restore();
}

/**
 * Pill bar of status icons floated above a token. "dead" is excluded here
 * since it gets its own overlay (see drawDeadOverlay) rather than an icon.
 */
export function drawStatusIconBar(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  statusEffects: string[],
) {
  const otherStatuses = statusEffects.filter((s) => s !== "dead");
  if (otherStatuses.length === 0) return;

  const iconSize = Math.max(14, Math.min(20, radius * 0.5));
  const gap = 4;
  const padding = 9;
  const totalWidth = otherStatuses.length * (iconSize + gap) - gap;
  const barWidth = totalWidth + padding * 2;
  const barHeight = iconSize + padding * 2;
  const startX = center.x - totalWidth / 2;
  const iconY = center.y - radius - iconSize - 8;
  const barX = center.x - barWidth / 2;
  const barY = iconY - padding;
  const barRadius = barHeight / 2;

  // Shared pill background & status icons (grouped to minimise save/restore thrash)
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(barX, barY, barWidth, barHeight, barRadius);
  } else {
    ctx.rect(barX, barY, barWidth, barHeight);
  }
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 0; i < otherStatuses.length; i++) {
    const statusId = otherStatuses[i];
    const cx = startX + i * (iconSize + gap) + iconSize / 2;
    const cy = iconY + iconSize / 2;
    const s = iconSize / 2;

    // Reset shadows from previous iteration
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    switch (statusId) {
      case "stunned": {
        // Zap / lightning bolt
        ctx.fillStyle = "#facc15";
        ctx.shadowColor = "rgba(250, 204, 21, 0.6)";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.1, -s + cy);
        ctx.lineTo(cx - s * 0.5, cy);
        ctx.lineTo(cx - s * 0.05, cy);
        ctx.lineTo(cx - s * 0.2, s + cy);
        ctx.lineTo(cx + s * 0.5, cy);
        ctx.lineTo(cx + s * 0.05, cy);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "prone": {
        // Arrow-down
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(168, 85, 247, 0.5)";
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(cx, -s * 0.6 + cy);
        ctx.lineTo(cx, s * 0.7 + cy);
        ctx.moveTo(cx - s * 0.4, s * 0.2 + cy);
        ctx.lineTo(cx, s * 0.7 + cy);
        ctx.lineTo(cx + s * 0.4, s * 0.2 + cy);
        ctx.stroke();
        break;
      }
      case "poisoned": {
        // Skull / flask-conical
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "rgba(34, 197, 94, 0.5)";
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc(cx, cy - s * 0.2, s * 0.35, Math.PI, 0, false);
        ctx.lineTo(cx + s * 0.35, cy + s * 0.2);
        ctx.lineTo(cx + s * 0.5, cy + s * 0.9);
        ctx.lineTo(cx - s * 0.5, cy + s * 0.9);
        ctx.lineTo(cx - s * 0.35, cy + s * 0.2);
        ctx.closePath();
        ctx.stroke();
        // Eyes
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.arc(cx - s * 0.12, cy - s * 0.2, 1.2, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + s * 0.12, cy - s * 0.2, 1.2, 0, TAU);
        ctx.fill();
        break;
      }
      case "invisible": {
        // Eye with slash (eye-off)
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "rgba(148, 163, 184, 0.5)";
        ctx.shadowBlur = 3;
        // Eye shape
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.7, cy);
        ctx.quadraticCurveTo(cx, cy - s * 0.7, cx + s * 0.7, cy);
        ctx.quadraticCurveTo(cx, cy + s * 0.7, cx - s * 0.7, cy);
        ctx.stroke();
        // Iris
        ctx.beginPath();
        ctx.arc(cx, cy, s * 0.25, 0, TAU);
        ctx.stroke();
        // Slash
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.6, cy - s * 0.7);
        ctx.lineTo(cx + s * 0.6, cy + s * 0.7);
        ctx.stroke();
        break;
      }
    }
  }
  ctx.restore();
}

/**
 * Draws all token status effect overlays: the dead X overlay (if present)
 * and the floating pill bar for everything else.
 */
export function drawStatusEffects(
  ctx: CanvasRenderingContext2D,
  traceShape: TraceTokenShape,
  center: { x: number; y: number },
  rotation: number,
  shape: "circle" | "square",
  width: number,
  height: number,
  radius: number,
  statusEffects: string[] | undefined,
) {
  if (!statusEffects || statusEffects.length === 0) return;

  if (statusEffects.includes("dead")) {
    drawDeadOverlay(
      ctx,
      traceShape,
      center,
      rotation,
      shape,
      width,
      height,
      radius,
    );
  }
  drawStatusIconBar(ctx, center, radius, statusEffects);
}
