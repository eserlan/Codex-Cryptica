import type { Point } from "schema";
import type { Token } from "../../../../types/vtt";
import { hitTestToken } from "$lib/utils/vtt-helpers";

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
}

export interface TokenDragState {
  tokenId: string;
  offset: Point;
}

export class TokenDragHandler {
  dragState: TokenDragState | null = null;

  constructor(private deps: TokenDragDependencies) {}

  begin(viewportPoint: Point) {
    const hitToken = hitTestToken(
      this.deps.getTokens(),
      this.deps.project,
      viewportPoint.x,
      viewportPoint.y,
    );

    if (
      !hitToken ||
      !this.deps.canMoveToken(
        hitToken.id,
        this.deps.getPeerId(),
        this.deps.isHostMode(),
      )
    ) {
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

  end() {
    if (!this.dragState) return false;
    if (!this.deps.isHostMode()) {
      this.deps.confirmTokenMove(this.dragState.tokenId);
    }
    this.deps.setDraggingTokenId(null);
    this.dragState = null;
    return true;
  }
}
