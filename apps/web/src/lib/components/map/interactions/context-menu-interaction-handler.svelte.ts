import type { Point } from "schema";
import type { TokenSelectionManager } from "./token-selection-manager";

export interface MapContextMenuState {
  x: number;
  y: number;
  imgX: number;
  imgY: number;
  tokenId?: string;
  /** The empty hex under the cursor, when the GM can reveal or fog it. */
  hex?: { q: number; r: number; fogged: boolean };
}

export interface ContextMenuInteractionDependencies {
  isVttEnabled: () => boolean;
  unproject: (point: Point) => Point;
  tokenSelection: TokenSelectionManager;
  /** Image-space point to the hex a GM could reveal or fog there, if any. */
  getFogHexTarget?: (
    imgPoint: Point,
  ) => { hex: { q: number; r: number }; fogged: boolean } | null;
}

export class ContextMenuInteractionHandler {
  contextMenu = $state<MapContextMenuState | null>(null);

  constructor(private deps: ContextMenuInteractionDependencies) {}

  clear() {
    this.contextMenu = null;
  }

  open(eventPoint: Point, viewportPoint: Point) {
    const hitToken = this.deps.tokenSelection.hitTest(viewportPoint);
    const imgCoords = this.deps.unproject(viewportPoint);
    const hexTarget = hitToken ? null : this.deps.getFogHexTarget?.(imgCoords);

    // With play off the map is an ordinary map again, but a note on it is
    // still the GM's to reveal, relabel or delete, so its menu stays open.
    // The same goes for a fogged hex, which the GM may reveal at any time.
    if (!this.deps.isVttEnabled() && hitToken?.kind !== "note" && !hexTarget) {
      return false;
    }

    this.contextMenu = {
      x: eventPoint.x,
      y: eventPoint.y,
      imgX: imgCoords.x,
      imgY: imgCoords.y,
      tokenId: hitToken?.id,
      hex: hexTarget
        ? { q: hexTarget.hex.q, r: hexTarget.hex.r, fogged: hexTarget.fogged }
        : undefined,
    };
    return true;
  }
}
