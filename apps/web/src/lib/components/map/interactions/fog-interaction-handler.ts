import type { Point } from "schema";
import type { HexCoord } from "map-engine";
import type { MapFogPainter } from "../map-fog-painter";

export interface FogInteractionDependencies {
  painter: MapFogPainter;
  canPaint: () => boolean;
  shouldBroadcastFogSync: () => boolean;
  broadcastFogSync: () => unknown;
}

export class FogInteractionHandler {
  constructor(private deps: FogInteractionDependencies) {}

  get isPainting() {
    return this.deps.painter.isPainting;
  }

  begin(point: Point, erase: boolean) {
    if (!this.deps.canPaint()) return false;
    this.deps.painter.begin(point, erase);
    return true;
  }

  move(point: Point, erase: boolean) {
    if (!this.deps.painter.isPainting) return false;
    this.deps.painter.move(point, erase);
    return true;
  }

  /** Where a right-click could reveal or fog one hex, or null when it cannot. */
  hexTargetAt(point: Point) {
    if (!this.deps.canPaint()) return null;
    return this.deps.painter.hexAt(point);
  }

  async paintHex(hex: HexCoord, hide: boolean) {
    if (!this.deps.canPaint()) return false;
    const painted = await this.deps.painter.paintHex(hex, hide);
    if (painted && this.deps.shouldBroadcastFogSync()) {
      void this.deps.broadcastFogSync();
    }
    return painted;
  }

  async finish() {
    if (!this.deps.painter.isPainting) return false;
    const finished = await this.deps.painter.finish();
    if (finished && this.deps.shouldBroadcastFogSync()) {
      void this.deps.broadcastFogSync();
    }
    return true;
  }
}
