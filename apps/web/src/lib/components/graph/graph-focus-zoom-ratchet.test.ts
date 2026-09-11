import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  FocusZoomRatchet,
  resolveFocusDepth,
  FOCUS_ZOOM_STEP_FACTOR,
} from "./graph-focus-zoom-ratchet";

describe("resolveFocusDepth", () => {
  const bounds = { min: 1, max: 6, stepFactor: FOCUS_ZOOM_STEP_FACTOR };

  it("increases depth when zoom crosses the step factor threshold in", () => {
    const result = resolveFocusDepth(2, 1 * FOCUS_ZOOM_STEP_FACTOR, 1, bounds);
    expect(result.depth).toBe(3);
    expect(result.mark).toBe(FOCUS_ZOOM_STEP_FACTOR);
  });

  it("decreases depth when zoom crosses the step factor threshold out", () => {
    const result = resolveFocusDepth(3, 1 / FOCUS_ZOOM_STEP_FACTOR, 1, bounds);
    expect(result.depth).toBe(2);
    expect(result.mark).toBe(1 / FOCUS_ZOOM_STEP_FACTOR);
  });

  it("clamps at max depth and does not move the mark", () => {
    const result = resolveFocusDepth(6, 100, 1, bounds);
    expect(result.depth).toBe(6);
    expect(result.mark).toBe(1);
  });
});

describe("FocusZoomRatchet", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const bounds = { min: 1, max: 6, stepFactor: FOCUS_ZOOM_STEP_FACTOR };

  it("debounces scheduleSettle so only the last call fires", () => {
    const ratchet = new FocusZoomRatchet({ settleMs: 100 });
    const onSettle = vi.fn();
    ratchet.scheduleSettle(onSettle);
    vi.advanceTimersByTime(50);
    ratchet.scheduleSettle(onSettle);
    vi.advanceTimersByTime(50);
    expect(onSettle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(onSettle).toHaveBeenCalledTimes(1);
  });

  it("anchors the mark on first observation without changing depth", () => {
    const ratchet = new FocusZoomRatchet();
    const result = ratchet.resolveSettledZoom(2, 3, bounds);
    expect(result).toBeNull();
  });

  it("resolves a depth change once anchored and the zoom crosses the ratchet", () => {
    const ratchet = new FocusZoomRatchet();
    ratchet.resolveSettledZoom(1, 3, bounds); // anchor mark at 1
    const result = ratchet.resolveSettledZoom(
      1 * FOCUS_ZOOM_STEP_FACTOR,
      3,
      bounds,
    );
    expect(result).toEqual({ depth: 4 });
  });

  it("ignores zoom samples while suppressed (e.g. during a programmatic fit)", () => {
    const ratchet = new FocusZoomRatchet();
    ratchet.resolveSettledZoom(1, 3, bounds); // anchor mark at 1
    ratchet.suppress();
    const result = ratchet.resolveSettledZoom(
      1 * FOCUS_ZOOM_STEP_FACTOR,
      3,
      bounds,
    );
    expect(result).toBeNull();
  });

  it("rebaselines the mark to the post-fit zoom after the rebaseline delay", () => {
    const ratchet = new FocusZoomRatchet({ rebaselineMs: 100 });
    ratchet.suppress();
    ratchet.scheduleRebaseline(() => 5);
    expect(ratchet.isSuppressed).toBe(false);
    vi.advanceTimersByTime(100);
    // Mark is now anchored at 5, so a zoom of 5 should not trigger a change,
    // while crossing the step factor from 5 should.
    const noChange = ratchet.resolveSettledZoom(5, 3, bounds);
    expect(noChange).toBeNull();
    const changed = ratchet.resolveSettledZoom(
      5 * FOCUS_ZOOM_STEP_FACTOR,
      3,
      bounds,
    );
    expect(changed).toEqual({ depth: 4 });
  });

  it("does not rebaseline to a non-positive zoom", () => {
    const ratchet = new FocusZoomRatchet({ rebaselineMs: 100 });
    ratchet.resolveSettledZoom(1, 3, bounds); // anchor mark at 1
    ratchet.suppress();
    ratchet.scheduleRebaseline(() => null);
    vi.advanceTimersByTime(100);
    // Mark should remain at 1, so crossing the step factor from 1 still changes depth.
    const result = ratchet.resolveSettledZoom(
      1 * FOCUS_ZOOM_STEP_FACTOR,
      3,
      bounds,
    );
    expect(result).toEqual({ depth: 4 });
  });

  it("clearTimers cancels pending settle and rebaseline callbacks", () => {
    const ratchet = new FocusZoomRatchet({ settleMs: 100, rebaselineMs: 100 });
    const onSettle = vi.fn();
    ratchet.scheduleSettle(onSettle);
    ratchet.scheduleRebaseline(() => 9);
    ratchet.clearTimers();
    vi.advanceTimersByTime(200);
    expect(onSettle).not.toHaveBeenCalled();
  });
});
