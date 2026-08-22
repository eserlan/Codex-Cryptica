import type { Token } from "../../../types/vtt";
import { punchFogCircle } from "./fog-stroke";

export interface TokenVisionRevealerDeps {
  mapStore: {
    activeMapId: string | null;
    saveMask(canvas: HTMLCanvasElement): Promise<void>;
  };
  getMaskCanvas: () => HTMLCanvasElement | null;
  getMapImage: () => HTMLImageElement | null;
}

/**
 * Auto-reveals fog of war around vision-source tokens as they move or as
 * selection/mode changes. Unlike MapFogPainter, this is a passive side
 * effect of token movement rather than a deliberate GM brush stroke, so it
 * does not push undo entries and always punches a permanent, full-strength
 * hole (no dimmed/explored tier for v1 — see plan for #2414).
 */
export class TokenVisionRevealer {
  constructor(private deps: TokenVisionRevealerDeps) {}

  async reveal(tokens: Token[], radius: number): Promise<boolean> {
    if (tokens.length === 0) return false;

    const maskCanvas = this.deps.getMaskCanvas();
    const image = this.deps.getMapImage();
    const activeMapId = this.deps.mapStore.activeMapId;

    if (!maskCanvas || !image || !activeMapId) {
      return false;
    }

    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return false;

    for (const token of tokens) {
      punchFogCircle(ctx, image, radius, { x: token.x, y: token.y });
    }

    await this.deps.mapStore.saveMask(maskCanvas);
    return true;
  }
}
