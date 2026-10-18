import {
  getTokenCenter,
  hexToPoint,
  pointToHex,
  type HexCoord,
  type HexGridConfig,
} from "map-engine";
import type { Token } from "../../../../types/vtt";
import type { MapMoveCoordinator } from "../map-move-coordinator";

export interface HexJourneyMovementDeps {
  coordinator: MapMoveCoordinator;
  getToken: (id: string) => Token | undefined;
  getRouteIdentity: () => string | null;
  getGrid: () => HexGridConfig | null;
  getPermission: (token: Token) => boolean;
  moveToken: (
    token: Token,
    x: number,
    y: number,
  ) => Promise<Token | null> | Token | null;
  completeMove: (before: Token, after: Token) => Promise<void>;
  explore: (mapId: string, hex: HexCoord) => Promise<unknown>;
  openArrival: (mapId: string, hex: HexCoord, newlyExplored: boolean) => void;
  getMapId: () => string | null;
}

export type HexJourneyStepResult =
  | { moved: false; reason: string }
  | { moved: true; arrivalSaved: boolean; error?: string };

/** Moves exactly one token centre to one adjacent hex via the ordinary map API. */
export class HexJourneyMovement {
  constructor(private readonly deps: HexJourneyMovementDeps) {}

  // fallow-ignore-next-line complexity -- Coordinates one move across permission, identity, capture, and arrival-save boundaries.
  async step(
    tokenId: string,
    expectedFrom: HexCoord,
    target: HexCoord,
  ): Promise<HexJourneyStepResult> {
    const grid = this.deps.getGrid();
    const mapId = this.deps.getMapId();
    const identity = this.deps.getRouteIdentity();
    const before = this.deps.getToken(tokenId);
    if (!grid || !mapId || !identity || !before)
      return { moved: false, reason: "The party token or map is unavailable." };
    if (
      before.isVisionSource !== true ||
      before.locked ||
      !this.deps.getPermission(before)
    )
      return { moved: false, reason: "The party token cannot move." };
    if (!sameHex(pointToHex(getTokenCenter(before), grid), expectedFrom))
      return {
        moved: false,
        reason: "The party moved. Plan the journey again.",
      };
    const centre = hexToPoint(target, grid);
    const result = await this.deps.coordinator.moveJourneyStep(
      tokenId,
      before,
      {
        move: async () => {
          const current = this.deps.getToken(tokenId);
          if (!current || current.locked || !this.deps.getPermission(current))
            return null;
          const movedToken = await this.deps.moveToken(
            current,
            centre.x - current.width / 2,
            centre.y - current.height / 2,
          );
          if (
            !movedToken ||
            !sameHex(pointToHex(getTokenCenter(movedToken), grid), target)
          )
            return null;
          return movedToken;
        },
        complete: (from, to) => {
          const current = this.deps.getToken(tokenId);
          if (
            this.deps.getMapId() !== mapId ||
            this.deps.getRouteIdentity() !== identity ||
            !sameGrid(this.deps.getGrid(), grid) ||
            !current ||
            !this.deps.getPermission(current)
          )
            return Promise.resolve();
          return this.deps.completeMove(from, to);
        },
      },
    );
    if (!result.ok)
      return {
        moved: false,
        reason:
          result.reason === "busy"
            ? "A journey move is already in progress."
            : "Movement did not reach the next hex.",
      };
    if (
      this.deps.getMapId() !== mapId ||
      this.deps.getRouteIdentity() !== identity ||
      !sameGrid(this.deps.getGrid(), grid)
    )
      return {
        moved: true,
        arrivalSaved: false,
        error:
          "The map changed during the move. Return to the original map to retry the arrival.",
      };
    const currentAfterMove = this.deps.getToken(tokenId);
    if (!currentAfterMove || !this.deps.getPermission(currentAfterMove)) {
      return {
        moved: true,
        arrivalSaved: false,
        error:
          "Movement permission changed. Ask the host GM to retry the arrival save.",
      };
    }
    try {
      const saved = await this.deps.explore(mapId, target);
      if (saved === false) throw new Error("Arrival save was refused.");
      this.deps.openArrival(
        mapId,
        target,
        typeof saved === "object" &&
          saved !== null &&
          "newlyExplored" in saved &&
          saved.newlyExplored === true,
      );
      return { moved: true, arrivalSaved: true };
    } catch {
      return {
        moved: true,
        arrivalSaved: false,
        error:
          "The token moved, but the arrival could not be saved. Retry the arrival save.",
      };
    }
  }

  async retryArrival(mapId: string, hex: HexCoord): Promise<boolean> {
    if (this.deps.getMapId() !== mapId) return false;
    const identity = this.deps.getRouteIdentity();
    if (!identity) return false;
    const saved = await this.deps.explore(mapId, hex);
    if (saved === false) return false;
    if (
      this.deps.getMapId() !== mapId ||
      this.deps.getRouteIdentity() !== identity
    )
      return false;
    const newlyExplored =
      typeof saved === "object" &&
      saved !== null &&
      "newlyExplored" in saved &&
      saved.newlyExplored === true;
    this.deps.openArrival(mapId, hex, newlyExplored);
    return true;
  }
}

function sameHex(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}
function sameGrid(a: HexGridConfig | null, b: HexGridConfig): boolean {
  return Boolean(
    a &&
    a.orientation === b.orientation &&
    a.size === b.size &&
    a.offsetX === b.offsetX &&
    a.offsetY === b.offsetY,
  );
}
