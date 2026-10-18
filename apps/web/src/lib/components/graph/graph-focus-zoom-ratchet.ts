/** Each `FOCUS_ZOOM_STEP_FACTOR`x zoom in/out changes one focus detail level. */
export const FOCUS_ZOOM_STEP_FACTOR = 1.8;

const DEFAULT_SETTLE_MS = 150;
const DEFAULT_REBASELINE_MS = 300;

/**
 * Pure ratchet that maps a zoom change into a focus-view depth change, relative
 * to the zoom at the last depth change (`zoomMark`). Zooming in past the step
 * factor reveals more detail; zooming out hides detail. Returns the (possibly
 * unchanged) depth and the mark to anchor the next step from. Relative rather
 * than absolute so it composes with whatever zoom an auto-fit lands on.
 */
export function resolveFocusDepth(
  currentDepth: number,
  zoom: number,
  zoomMark: number,
  bounds: { min: number; max: number; stepFactor: number },
): { depth: number; mark: number } {
  if (zoom >= zoomMark * bounds.stepFactor && currentDepth < bounds.max) {
    return { depth: currentDepth + 1, mark: zoom };
  }
  if (zoom <= zoomMark / bounds.stepFactor && currentDepth > bounds.min) {
    return { depth: currentDepth - 1, mark: zoom };
  }
  return { depth: currentDepth, mark: zoomMark };
}

/**
 * Debounces Cytoscape's continuous "zoom" events into settled samples, then
 * ratchets them into focus-view depth changes via `resolveFocusDepth`. Also
 * owns the "programmatic fit in flight" suppression window: a fit moves the
 * camera itself, so zoom events it causes must not be misread as a user-driven
 * reveal — they're muted until the fit's rebaseline timer re-anchors the mark
 * to wherever the fit actually landed.
 */
export class FocusZoomRatchet {
  private mark = 0;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private rebaselineTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressed = false;
  private readonly settleMs: number;
  private readonly rebaselineMs: number;

  constructor(options?: { settleMs?: number; rebaselineMs?: number }) {
    this.settleMs = options?.settleMs ?? DEFAULT_SETTLE_MS;
    this.rebaselineMs = options?.rebaselineMs ?? DEFAULT_REBASELINE_MS;
  }

  get isSuppressed(): boolean {
    return this.suppressed;
  }

  /** Mutes the ratchet for the duration of a programmatic camera fit. */
  suppress(): void {
    this.suppressed = true;
  }

  /** Lifts suppression without touching the mark (e.g. on visibility suspend). */
  unsuppress(): void {
    this.suppressed = false;
  }

  /** Debounces a raw zoom event; calls `onSettle` once zoom has stopped changing. */
  scheduleSettle(onSettle: () => void): void {
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      this.settleTimer = null;
      onSettle();
    }, this.settleMs);
  }

  /**
   * Feeds a settled zoom sample through the ratchet. Returns the new depth
   * when it should change, or `null` when suppressed, unchanged, or when this
   * is the first observation (which only anchors the mark).
   */
  resolveSettledZoom(
    zoom: number,
    currentDepth: number,
    bounds: { min: number; max: number; stepFactor: number },
  ): { depth: number } | null {
    if (this.suppressed) return null;
    if (this.mark === 0) {
      this.mark = zoom;
      return null;
    }
    const { depth, mark } = resolveFocusDepth(
      currentDepth,
      zoom,
      this.mark,
      bounds,
    );
    this.mark = mark;
    if (depth === currentDepth) return null;
    return { depth };
  }

  /**
   * Un-suppresses immediately (a fit is done moving the camera) and schedules
   * re-anchoring the mark to the zoom the fit settles at. Deferred on its own
   * timer (rather than trusting the fit-stop callback's transient zoom)
   * because a re-cull can chain further fits, or the slash guard can re-fit
   * later, before the camera has actually settled.
   */
  scheduleRebaseline(getZoom: () => number | null): void {
    this.suppressed = false;
    if (this.rebaselineTimer) clearTimeout(this.rebaselineTimer);
    this.rebaselineTimer = setTimeout(() => {
      this.rebaselineTimer = null;
      const zoom = getZoom();
      if (zoom !== null && zoom > 0) this.mark = zoom;
    }, this.rebaselineMs);
  }

  clearTimers(): void {
    if (this.settleTimer) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    if (this.rebaselineTimer) {
      clearTimeout(this.rebaselineTimer);
      this.rebaselineTimer = null;
    }
  }
}
