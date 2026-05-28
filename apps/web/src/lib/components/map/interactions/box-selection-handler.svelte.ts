import type { Point } from "schema";
import type { TokenSelectionManager } from "./token-selection-manager";

export interface BoxSelectionDependencies {
  isHostMode: () => boolean;
  isVttEnabled: () => boolean;
  tokenSelection: TokenSelectionManager;
}

export class BoxSelectionHandler {
  start = $state<Point | null>(null);
  end = $state<Point | null>(null);

  constructor(private deps: BoxSelectionDependencies) {}

  begin(point: Point, modifiers: { ctrlKey?: boolean; metaKey?: boolean }) {
    if (
      !this.deps.isHostMode() ||
      !this.deps.isVttEnabled() ||
      (!modifiers.ctrlKey && !modifiers.metaKey)
    ) {
      return false;
    }

    this.start = point;
    this.end = point;
    return true;
  }

  update(point: Point) {
    if (!this.start) return false;
    this.end = point;
    return true;
  }

  commit() {
    if (!this.start || !this.end) return false;
    this.deps.tokenSelection.selectWithinBox(this.start, this.end);
    this.clear();
    return true;
  }

  clear() {
    this.start = null;
    this.end = null;
  }
}
