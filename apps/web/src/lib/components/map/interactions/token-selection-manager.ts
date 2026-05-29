import type { Point } from "schema";
import type { Token } from "../../../../types/vtt";
import { hitTestToken } from "$lib/utils/vtt-helpers";

export interface TokenSelectionDependencies {
  getTokens: () => Token[];
  project: (point: Point) => Point;
  getSelectedTokens: () => ReadonlySet<string>;
  setSelection: (tokenId: string | null) => void;
  addToSelection: (tokenId: string) => void;
  removeFromSelection: (tokenId: string) => void;
  setMultiSelection: (tokenIds: string[]) => void;
}

export class TokenSelectionManager {
  constructor(private deps: TokenSelectionDependencies) {}

  hitTest(point: Point) {
    return hitTestToken(
      this.deps.getTokens(),
      this.deps.project,
      point.x,
      point.y,
    );
  }

  applyModifierSelection(
    tokenId: string,
    modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean },
  ) {
    if (modifiers.ctrlKey || modifiers.metaKey) {
      this.deps.addToSelection(tokenId);
      return;
    }

    if (modifiers.shiftKey) {
      if (this.deps.getSelectedTokens().has(tokenId)) {
        this.deps.removeFromSelection(tokenId);
      } else {
        this.deps.addToSelection(tokenId);
      }
      return;
    }

    this.deps.setSelection(tokenId);
  }

  selectToken(tokenId: string) {
    this.deps.setSelection(tokenId);
  }

  clearSelection() {
    this.deps.setSelection(null);
  }

  selectWithinBox(start: Point, end: Point, minArea = 100) {
    const x1 = Math.min(start.x, end.x);
    const y1 = Math.min(start.y, end.y);
    const x2 = Math.max(start.x, end.x);
    const y2 = Math.max(start.y, end.y);

    if ((x2 - x1) * (y2 - y1) <= minArea) {
      return false;
    }

    const selected: string[] = [];
    for (const token of this.deps.getTokens()) {
      const projected = this.deps.project({ x: token.x, y: token.y });
      if (
        projected.x >= x1 &&
        projected.x <= x2 &&
        projected.y >= y1 &&
        projected.y <= y2
      ) {
        selected.push(token.id);
      }
    }

    this.deps.setMultiSelection(selected);
    return true;
  }
}
