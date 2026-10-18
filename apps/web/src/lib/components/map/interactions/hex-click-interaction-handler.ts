import type { Point } from "schema";
import type { HexCoord } from "map-engine";
import { POINTER_DISPLACEMENT_THRESHOLD } from "./pointer-thresholds";

/** What the click handler needs to know about the map and the viewer right now. */
export interface HexClickState {
  /** GM, not a guest and not a Player View preview (FR-041). */
  canSeeHexCrawl: boolean;
  /** Hex Crawl mode is on for the active map. */
  enabled: boolean;
  /** The active map uses a hex grid. */
  isHexGrid: boolean;
  mapId: string | null;
  /** Grid move or fit, note or tile placement, or a measurement is in progress. */
  blocked: boolean;
}

export interface HexClickDependencies {
  readState: () => HexClickState;
  /** The hex under a screen point (container-relative). */
  hexAt: (point: Point) => HexCoord;
  openHex: (mapId: string, hex: HexCoord) => void;
}

export interface HexClickGesture {
  start: Point;
  end: Point;
  altKey: boolean;
}

function displacement(start: Point, end: Point): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

/**
 * Opens the hex panel for an empty-map click (research D7). Only a click counts:
 * a pan that moved the pointer is ignored, and so is anything that owns the press.
 */
export class HexClickInteractionHandler {
  constructor(private readonly deps: HexClickDependencies) {}

  /** Returns true when a hex was opened. */
  handle(gesture: HexClickGesture): boolean {
    if (gesture.altKey) return false;
    if (
      displacement(gesture.start, gesture.end) >= POINTER_DISPLACEMENT_THRESHOLD
    ) {
      return false;
    }

    const state = this.deps.readState();
    if (
      !state.canSeeHexCrawl ||
      !state.enabled ||
      !state.isHexGrid ||
      state.blocked ||
      !state.mapId
    ) {
      return false;
    }

    this.deps.openHex(state.mapId, this.deps.hexAt(gesture.start));
    return true;
  }
}
