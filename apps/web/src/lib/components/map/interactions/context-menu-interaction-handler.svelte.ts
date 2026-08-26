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
    const hitToken = this.deps.tokenSelection.hitTest(viewportPoint);
    // With play off the map is an ordinary map again, but a note on it is
    // still the GM's to reveal, relabel or delete, so its menu stays open.
    if (!this.deps.isVttEnabled() && hitToken?.kind !== "note") return false;

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
