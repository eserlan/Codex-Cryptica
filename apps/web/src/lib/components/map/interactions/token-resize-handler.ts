import type { Point } from "schema";
import type { TokenStateUpdateInput } from "../../../../types/vtt";
import type { TokenSelectionManager } from "./token-selection-manager";

export interface TokenResizeDependencies {
  tokenSelection: TokenSelectionManager;
  getGridSize: () => number;
  updateToken: (tokenId: string, updates: TokenStateUpdateInput) => void;
}

export class TokenResizeHandler {
  constructor(private deps: TokenResizeDependencies) {}

  resizeAt(viewportPoint: Point, deltaY: number) {
    const hitToken = this.deps.tokenSelection.hitTest(viewportPoint);
    if (!hitToken || hitToken.locked) return false;

    const gridSize = this.deps.getGridSize() || 50;
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
