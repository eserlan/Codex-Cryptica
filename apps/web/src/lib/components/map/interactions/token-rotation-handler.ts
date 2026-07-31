import type { Point } from "schema";
import type { Token } from "../../../../types/vtt";
import {
  getTokenCenter,
  getTokenRotationHandlePosition,
  rotationFromPoint,
  TOKEN_ROTATION_HANDLE_RADIUS,
  TOKEN_FACING_INDICATOR_HIT_TOLERANCE,
  TOKEN_ROTATION_STEP,
  normalizeTokenRotation,
} from "map-engine";

export interface TokenRotationDependencies {
  getSelectedToken: () => Token | null;
  project: (point: Point) => Point;
  unproject: (point: Point) => Point;
  isHostMode: () => boolean;
  getPeerId: () => string | null;
  canMoveToken: (
    tokenId: string,
    peerId: string | null,
    isHost: boolean,
  ) => boolean;
  rotateToken: (tokenId: string, rotation: number) => void;
  requestTokenRotation: (
    tokenId: string,
    rotation: number,
    persistent: boolean,
  ) => void;
  sendTokenRotation: (tokenId: string, rotation: number) => void;
  confirmTokenRotation: (tokenId: string) => void;
}

export class TokenRotationHandler {
  rotationState: { tokenId: string } | null = null;

  constructor(private deps: TokenRotationDependencies) {}

  begin(viewportPoint: Point) {
    const token = this.deps.getSelectedToken();
    if (
      !token ||
      !this.deps.canMoveToken(
        token.id,
        this.deps.getPeerId(),
        this.deps.isHostMode(),
      )
    ) {
      return false;
    }

    const handle = this.deps.project(getTokenRotationHandlePosition(token));
    const handleHit =
      Math.hypot(viewportPoint.x - handle.x, viewportPoint.y - handle.y) <=
      TOKEN_ROTATION_HANDLE_RADIUS;

    const center = this.deps.project(getTokenCenter(token));
    const topLeft = this.deps.project({ x: token.x, y: token.y });
    const bottomRight = this.deps.project({
      x: token.x + token.width,
      y: token.y + token.height,
    });
    const tokenRadius =
      Math.min(
        Math.abs(bottomRight.x - topLeft.x),
        Math.abs(bottomRight.y - topLeft.y),
      ) / 2;
    const distanceFromCenter = Math.hypot(
      viewportPoint.x - center.x,
      viewportPoint.y - center.y,
    );
    const facingIndicatorHit =
      token.facingIndicator === true &&
      Math.abs(distanceFromCenter - tokenRadius) <=
        TOKEN_FACING_INDICATOR_HIT_TOLERANCE;

    if (!handleHit && !facingIndicatorHit) {
      return false;
    }

    this.rotationState = { tokenId: token.id };
    return true;
  }

  move(viewportPoint: Point) {
    if (!this.rotationState) return false;
    const token = this.deps.getSelectedToken();
    if (!token || token.id !== this.rotationState.tokenId) return false;

    const rotation = rotationFromPoint(
      getTokenCenter(token),
      this.deps.unproject(viewportPoint),
    );
    if (this.deps.isHostMode()) {
      this.deps.rotateToken(token.id, rotation);
    } else {
      this.deps.requestTokenRotation(token.id, rotation, true);
      this.deps.sendTokenRotation(token.id, rotation);
    }
    return true;
  }

  rotateByStep(step: number) {
    const token = this.deps.getSelectedToken();
    if (
      !token ||
      !this.deps.canMoveToken(
        token.id,
        this.deps.getPeerId(),
        this.deps.isHostMode(),
      )
    ) {
      return false;
    }

    const rotation = normalizeTokenRotation(
      token.rotation + step * TOKEN_ROTATION_STEP,
    );
    if (this.deps.isHostMode()) {
      this.deps.rotateToken(token.id, rotation);
    } else {
      this.deps.requestTokenRotation(token.id, rotation, true);
      this.deps.sendTokenRotation(token.id, rotation);
    }
    return true;
  }

  end() {
    if (!this.rotationState) return false;
    if (!this.deps.isHostMode()) {
      this.deps.confirmTokenRotation(this.rotationState.tokenId);
    }
    this.rotationState = null;
    return true;
  }
}
