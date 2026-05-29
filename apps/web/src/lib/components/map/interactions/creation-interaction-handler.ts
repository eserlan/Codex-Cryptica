import type { Point } from "schema";

export interface CreationInteractionDependencies {
  unproject: (point: Point) => Point;
  isVttEnabled: () => boolean;
  canCreateTokens: () => boolean;
  setPendingTokenCoords: (point: Point) => void;
  setPendingPinCoords: (point: Point) => void;
}

export class CreationInteractionHandler {
  constructor(private deps: CreationInteractionDependencies) {}

  handleDoubleClick(viewportPoint: Point) {
    const imgCoords = this.deps.unproject(viewportPoint);
    if (this.deps.isVttEnabled() && this.deps.canCreateTokens()) {
      this.deps.setPendingTokenCoords(imgCoords);
      return true;
    }

    if (!this.deps.isVttEnabled()) {
      this.deps.setPendingPinCoords(imgCoords);
      return true;
    }

    return false;
  }
}
