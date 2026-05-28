/**
 * Coalesces multiple redraw requests within the same animation frame into a
 * single draw call. Used by MapCanvas to switch from a 60 fps continuous
 * render loop to a redraw-on-dirty pattern.
 */

export interface RedrawSchedulerDeps {
  raf: (cb: FrameRequestCallback) => number;
  cancel: (id: number) => void;
}

const defaultDeps = (): RedrawSchedulerDeps => ({
  raf:
    typeof requestAnimationFrame !== "undefined"
      ? requestAnimationFrame
      : (cb) =>
          setTimeout(() => cb(performance.now()), 16) as unknown as number,
  cancel:
    typeof cancelAnimationFrame !== "undefined"
      ? cancelAnimationFrame
      : (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
});

export class CanvasRedrawScheduler {
  private animationFrameId: number | null = null;
  private readonly draw: () => void;
  private readonly raf: (cb: FrameRequestCallback) => number;
  private readonly cancel: (id: number) => void;

  constructor(draw: () => void, deps: Partial<RedrawSchedulerDeps> = {}) {
    this.draw = draw;
    const defaults = defaultDeps();
    this.raf = deps.raf ?? defaults.raf;
    this.cancel = deps.cancel ?? defaults.cancel;
  }

  /**
   * Request a redraw on the next animation frame. Multiple calls within the
   * same frame coalesce into one. No-op if a frame is already scheduled.
   */
  request(): void {
    if (this.animationFrameId !== null) return;
    this.animationFrameId = this.raf(() => {
      this.animationFrameId = null;
      this.draw();
    });
  }

  /**
   * True iff a frame is currently pending.
   */
  get pending(): boolean {
    return this.animationFrameId !== null;
  }

  /**
   * Cancel any pending frame.  Call from component teardown.
   */
  dispose(): void {
    if (this.animationFrameId !== null) {
      this.cancel(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

/**
 * Returns true if any ping is still within its animation window.  Used to
 * decide whether the canvas should keep an rAF loop alive between input
 * changes (pings animate from a timestamp, so they need time-driven redraws).
 */
export function hasActivePings(
  pings: ReadonlyArray<{ timestamp: number }>,
  now: number,
  durationMs: number,
): boolean {
  for (const p of pings) {
    if (now - p.timestamp < durationMs) return true;
  }
  return false;
}
