import { describe, it, expect, vi } from "vitest";
import { CanvasRedrawScheduler, hasActivePings } from "./map-canvas-scheduler";

describe("CanvasRedrawScheduler", () => {
  function makeFakeRaf() {
    let nextId = 1;
    const pending = new Map<number, FrameRequestCallback>();
    const raf = vi.fn((cb: FrameRequestCallback) => {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    });
    const cancel = vi.fn((id: number) => {
      pending.delete(id);
    });
    const tick = (timestamp = performance.now()) => {
      const callbacks = Array.from(pending.values());
      pending.clear();
      for (const cb of callbacks) cb(timestamp);
    };
    return { raf, cancel, tick, pendingCount: () => pending.size };
  }

  it("schedules one frame for a single request()", () => {
    const draw = vi.fn();
    const { raf, cancel, tick } = makeFakeRaf();
    const sched = new CanvasRedrawScheduler(draw, { raf, cancel });

    sched.request();
    expect(raf).toHaveBeenCalledTimes(1);
    expect(draw).not.toHaveBeenCalled();

    tick();
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it("coalesces multiple request() calls within the same frame", () => {
    const draw = vi.fn();
    const { raf, cancel, tick } = makeFakeRaf();
    const sched = new CanvasRedrawScheduler(draw, { raf, cancel });

    sched.request();
    sched.request();
    sched.request();
    sched.request();

    expect(raf).toHaveBeenCalledTimes(1);
    tick();
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it("schedules a new frame after the previous one fires", () => {
    const draw = vi.fn();
    const { raf, cancel, tick } = makeFakeRaf();
    const sched = new CanvasRedrawScheduler(draw, { raf, cancel });

    sched.request();
    tick();
    expect(draw).toHaveBeenCalledTimes(1);

    sched.request();
    tick();
    expect(draw).toHaveBeenCalledTimes(2);
    expect(raf).toHaveBeenCalledTimes(2);
  });

  it("does not draw spontaneously when idle (no request() calls)", () => {
    const draw = vi.fn();
    const { raf, cancel, tick } = makeFakeRaf();
    new CanvasRedrawScheduler(draw, { raf, cancel });

    // No request() — nothing should be scheduled.
    expect(raf).not.toHaveBeenCalled();
    tick(); // No-op because no pending frames.
    expect(draw).not.toHaveBeenCalled();
  });

  it("exposes pending status", () => {
    const draw = vi.fn();
    const { raf, cancel, tick } = makeFakeRaf();
    const sched = new CanvasRedrawScheduler(draw, { raf, cancel });

    expect(sched.pending).toBe(false);
    sched.request();
    expect(sched.pending).toBe(true);
    tick();
    expect(sched.pending).toBe(false);
  });

  it("dispose() cancels a pending frame", () => {
    const draw = vi.fn();
    const { raf, cancel, pendingCount } = makeFakeRaf();
    const sched = new CanvasRedrawScheduler(draw, { raf, cancel });

    sched.request();
    expect(pendingCount()).toBe(1);

    sched.dispose();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(sched.pending).toBe(false);
    expect(pendingCount()).toBe(0);
  });

  it("dispose() is a no-op when no frame is pending", () => {
    const draw = vi.fn();
    const { raf, cancel } = makeFakeRaf();
    const sched = new CanvasRedrawScheduler(draw, { raf, cancel });

    sched.dispose();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("re-uses a single scheduled frame across a tight burst of requests", () => {
    const draw = vi.fn();
    const { raf, cancel, tick } = makeFakeRaf();
    const sched = new CanvasRedrawScheduler(draw, { raf, cancel });

    for (let i = 0; i < 1000; i++) sched.request();
    expect(raf).toHaveBeenCalledTimes(1);

    tick();
    expect(draw).toHaveBeenCalledTimes(1);
  });
});

describe("hasActivePings", () => {
  const DURATION = 3000;

  it("returns false for an empty array", () => {
    expect(hasActivePings([], 1000, DURATION)).toBe(false);
  });

  it("returns true when at least one ping is within the duration window", () => {
    const now = 10000;
    const pings = [
      { timestamp: 4000 }, // 6000ms old — expired
      { timestamp: 8000 }, // 2000ms old — still active
    ];
    expect(hasActivePings(pings, now, DURATION)).toBe(true);
  });

  it("returns false when all pings have expired", () => {
    const now = 10000;
    const pings = [
      { timestamp: 4000 },
      { timestamp: 5000 },
      { timestamp: 6000 }, // 4000ms old — expired
    ];
    expect(hasActivePings(pings, now, DURATION)).toBe(false);
  });

  it("treats ping exactly at the duration boundary as expired", () => {
    const now = 10000;
    const pings = [{ timestamp: now - DURATION }];
    expect(hasActivePings(pings, now, DURATION)).toBe(false);
  });

  it("treats ping just inside the duration boundary as active", () => {
    const now = 10000;
    const pings = [{ timestamp: now - DURATION + 1 }];
    expect(hasActivePings(pings, now, DURATION)).toBe(true);
  });

  it("treats a fresh ping (now == timestamp) as active", () => {
    const now = 10000;
    const pings = [{ timestamp: now }];
    expect(hasActivePings(pings, now, DURATION)).toBe(true);
  });
});
