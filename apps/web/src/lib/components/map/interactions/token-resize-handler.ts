import type { Point } from "schema";
import type { TokenStateUpdateInput } from "../../../../types/vtt";
import type { TokenSelectionManager } from "./token-selection-manager";

export interface TokenResizeDependencies {
  tokenSelection: TokenSelectionManager;
  getGridSize: () => number;
  updateToken: (tokenId: string, updates: TokenStateUpdateInput) => void;
}

/** Notes resize in half-grid steps, between a marker and a full page. */
const NOTE_RESIZE_STEP = 0.5;
const NOTE_MIN_SCALE = 0.5;
const NOTE_MAX_SCALE = 8;

export class TokenResizeHandler {
  constructor(private deps: TokenResizeDependencies) {}

  resizeAt(viewportPoint: Point, deltaY: number) {
    const hitToken = this.deps.tokenSelection.hitTest(viewportPoint);
    if (!hitToken || hitToken.locked) return false;

    const gridSize = this.deps.getGridSize() || 50;

    // A note holds prose rather than a creature, so it is sized to fit its
    // text: half-grid steps, from a marker up to a full page, and no floor
    // at one whole cell.
    if (hitToken.kind === "note") {
      const step = gridSize * NOTE_RESIZE_STEP;
      const current = Math.round(hitToken.width / step) * step;
      const next = Math.max(
        gridSize * NOTE_MIN_SCALE,
        Math.min(
          gridSize * NOTE_MAX_SCALE,
          current + (deltaY < 0 ? step : -step),
        ),
      );

      if (next !== hitToken.width) {
        // Resizing a folded-away note expands it: the size it springs back
        // to is the one being set here, not the one it was collapsed at.
        this.deps.updateToken(hitToken.id, {
          width: next,
          height: next,
          noteCollapsedFrom: undefined,
        });
      }

      return true;
    }

    const currentScale = Math.round(hitToken.width / gridSize);
    // Character tokens stay capped at the standard Medium-to-Gargantuan
    // creature range (1-4x grid). Tiles carry no such convention — a pack
    // like Geomorph Collection mixes 5x5/10x5/10x10 modules that need a much
    // wider size range to resize believably relative to each other.
    const maxScale = hitToken.kind === "tile" ? 20 : 4;
    const nextScale = Math.max(
      1,
      Math.min(maxScale, currentScale + (deltaY < 0 ? 1 : -1)),
    );

    if (nextScale !== currentScale) {
      this.deps.updateToken(hitToken.id, {
        width: nextScale * gridSize,
        height: nextScale * gridSize,
      });
    }

    return true;
  }
}
