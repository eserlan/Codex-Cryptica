import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createLongPressTracker } from "./long-press-tracker";

describe("createLongPressTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires onLongPress with the payload and coordinates after the delay", () => {
    const onLongPress = vi.fn();
    const tracker = createLongPressTracker<string>({ onLongPress });

    tracker.handleTouchStart("item-1", 10, 20);
    expect(onLongPress).not.toHaveBeenCalled();

    vi.advanceTimersByTime(450);

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).toHaveBeenCalledWith("item-1", 10, 20);
    expect(tracker.consumeTriggered()).toBe(true);
    // Consuming clears the flag.
    expect(tracker.consumeTriggered()).toBe(false);
  });

  it("cancels the pending long press when the touch moves past the threshold", () => {
    const onLongPress = vi.fn();
    const tracker = createLongPressTracker<string>({ onLongPress });

    tracker.handleTouchStart("item-1", 10, 20);
    tracker.handleTouchMove(30, 20); // dx = 20 > default threshold of 10

    vi.advanceTimersByTime(450);

    expect(onLongPress).not.toHaveBeenCalled();
    expect(tracker.consumeTriggered()).toBe(false);
  });

  it("cancels the pending long press on touch end before the delay elapses", () => {
    const onLongPress = vi.fn();
    const tracker = createLongPressTracker<string>({ onLongPress, delayMs: 300 });

    tracker.handleTouchStart("item-1", 0, 0);
    tracker.handleTouchEnd();
    vi.advanceTimersByTime(300);

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("swallows vibrate failures without blocking onLongPress", () => {
    const onLongPress = vi.fn();
    const vibrate = vi.fn(() => {
      throw new Error("vibrate unsupported");
    });
    const tracker = createLongPressTracker<string>({ onLongPress, vibrate });

    tracker.handleTouchStart("item-1", 5, 5);
    vi.advanceTimersByTime(450);

    expect(vibrate).toHaveBeenCalledWith(40);
    expect(onLongPress).toHaveBeenCalledWith("item-1", 5, 5);
  });
});
