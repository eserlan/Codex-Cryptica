import type { Point } from "schema";
import type { TokenSelectionManager } from "./token-selection-manager";

export interface MapContextMenuState {
  x: number;
  y: number;
  imgX: number;
  imgY: number;
  tokenId?: string;
}

export interface ContextMenuInteractionDependencies {
  isVttEnabled: () => boolean;
  unproject: (point: Point) => Point;
  tokenSelection: TokenSelectionManager;
}

export class ContextMenuInteractionHandler {
  contextMenu = $state<MapContextMenuState | null>(null);

  constructor(private deps: ContextMenuInteractionDependencies) {}

  clear() {
    this.contextMenu = null;
  }

  open(eventPoint: Point, viewportPoint: Point) {
    if (!this.deps.isVttEnabled()) return false;

    const hitToken = this.deps.tokenSelection.hitTest(viewportPoint);
    const imgCoords = this.deps.unproject(viewportPoint);
    this.contextMenu = {
      x: eventPoint.x,
      y: eventPoint.y,
      imgX: imgCoords.x,
      imgY: imgCoords.y,
      tokenId: hitToken?.id,
    };
    return true;
  }
}
