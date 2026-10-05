import type { Point } from "schema";
import type { Token } from "../../../../types/vtt";
import { hitTestToken } from "$lib/utils/vtt-helpers";
import { snapPointToHexCenter, type HexOrientation } from "map-engine";

export interface TokenGridConfig {
  enabled: boolean;
  type: "square" | "hex-pointy" | "hex-flat";
  size: number;
  offsetX: number;
  offsetY: number;
}

export interface TokenDragDependencies {
  getTokens: () => Token[];
  project: (point: Point) => Point;
  unproject: (point: Point) => Point;
  isHostMode: () => boolean;
  getPeerId: () => string | null;
  canMoveToken: (
    tokenId: string,
    peerId: string | null,
    isHost: boolean,
  ) => boolean;
  moveToken: (tokenId: string, x: number, y: number) => void;
  requestTokenMove: (
    tokenId: string,
    x: number,
    y: number,
    persistent: boolean,
  ) => void;
  sendTokenMoveRequest: (tokenId: string, x: number, y: number) => void;
  confirmTokenMove: (tokenId: string) => void;
  setDraggingTokenId: (tokenId: string | null) => void;
  getGridConfig?: () => TokenGridConfig | null;
}

export interface TokenDragState {
  tokenId: string;
  offset: Point;
}

export class TokenDragHandler {
  dragState: TokenDragState | null = null;
  /**
   * The token a `begin()` landed on but isn't allowed to move. Lets callers
   * tell "pressed empty map" (fine to pan) apart from "pressed a locked
   * tile" — panning the map out from under that press reads as the drag
   * moving the whole map instead of the piece under the cursor.
   */
  blockedToken: Token | null = null;

  constructor(private deps: TokenDragDependencies) {}

  begin(viewportPoint: Point) {
    const hitToken = hitTestToken(
      this.deps.getTokens(),
      this.deps.project,
      viewportPoint.x,
      viewportPoint.y,
    );

    this.blockedToken = null;

    if (!hitToken) return null;

    if (
      !this.deps.canMoveToken(
        hitToken.id,
        this.deps.getPeerId(),
        this.deps.isHostMode(),
      )
    ) {
      this.blockedToken = hitToken;
      return null;
    }

    const imgPoint = this.deps.unproject(viewportPoint);
    this.dragState = {
      tokenId: hitToken.id,
      offset: {
        x: imgPoint.x - hitToken.x,
        y: imgPoint.y - hitToken.y,
      },
    };
    this.deps.setDraggingTokenId(hitToken.id);
    return hitToken;
  }

  move(viewportPoint: Point) {
    if (!this.dragState) return false;

    const imgPoint = this.deps.unproject(viewportPoint);
    const nextX = imgPoint.x - this.dragState.offset.x;
    const nextY = imgPoint.y - this.dragState.offset.y;

    if (this.deps.isHostMode()) {
      this.deps.moveToken(this.dragState.tokenId, nextX, nextY);
    } else {
      this.deps.requestTokenMove(this.dragState.tokenId, nextX, nextY, true);
      this.deps.sendTokenMoveRequest(this.dragState.tokenId, nextX, nextY);
    }

    return true;
  }

  // fallow-ignore-next-line complexity
  end() {
    if (!this.dragState) return false;

    const gridConfig = this.deps.getGridConfig?.();
    if (gridConfig?.enabled && gridConfig.size > 0) {
      const token = this.deps
        .getTokens()
        .find((t) => t.id === this.dragState!.tokenId);
      if (token) {
        let snapped: Point;
        if (
          gridConfig.type === "hex-pointy" ||
          gridConfig.type === "hex-flat"
        ) {
          const orientation: HexOrientation =
            gridConfig.type === "hex-flat" ? "flat" : "pointy";
          snapped = snapPointToHexCenter(
            { x: token.x, y: token.y },
            {
              orientation,
              size: gridConfig.size,
              offsetX: gridConfig.offsetX,
              offsetY: gridConfig.offsetY,
            },
          );
        } else {
          snapped = {
            x:
              Math.round((token.x - gridConfig.offsetX) / gridConfig.size) *
                gridConfig.size +
              gridConfig.offsetX,
            y:
              Math.round((token.y - gridConfig.offsetY) / gridConfig.size) *
                gridConfig.size +
              gridConfig.offsetY,
          };
        }

        if (this.deps.isHostMode()) {
          this.deps.moveToken(token.id, snapped.x, snapped.y);
        } else {
          this.deps.requestTokenMove(token.id, snapped.x, snapped.y, true);
          this.deps.sendTokenMoveRequest(token.id, snapped.x, snapped.y);
        }
      }
    }

    if (!this.deps.isHostMode()) {
      this.deps.confirmTokenMove(this.dragState.tokenId);
    }
    this.deps.setDraggingTokenId(null);
    this.dragState = null;
    return true;
  }
}
