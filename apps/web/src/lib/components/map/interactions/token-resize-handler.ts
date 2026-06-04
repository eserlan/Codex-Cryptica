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
    if (!hitToken) return false;

    const gridSize = this.deps.getGridSize() || 50;
    const currentScale = Math.round(hitToken.width / gridSize);
    const nextScale = Math.max(
      1,
      Math.min(4, currentScale + (deltaY < 0 ? 1 : -1)),
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
