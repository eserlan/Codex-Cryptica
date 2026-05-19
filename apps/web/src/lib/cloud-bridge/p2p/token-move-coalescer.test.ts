import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TokenMoveCoalescer } from "./token-move-coalescer";

describe("TokenMoveCoalescer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("emits exactly one send per throttle window with the latest coords", () => {
    const send = vi.fn();
    const coalescer = new TokenMoveCoalescer(send, 50);

    coalescer.request("t1", 1.001, 2.001);
    coalescer.request("t1", 1.5, 2.5);
    coalescer.request("t1", 3.4567, 4.1234);

    expect(send).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith("t1", 3.46, 4.12);
  });

  it("rounds to 2 decimals", () => {
    const send = vi.fn();
    const coalescer = new TokenMoveCoalescer(send, 50);
    coalescer.request("t1", 1.239, 9.871);
    vi.advanceTimersByTime(50);
    expect(send).toHaveBeenCalledWith("t1", 1.24, 9.87);
  });

  it("dedupes against the last sent coordinates", () => {
    const send = vi.fn();
    const coalescer = new TokenMoveCoalescer(send, 50);

    coalescer.request("t1", 1, 1);
    vi.advanceTimersByTime(50);
    expect(send).toHaveBeenCalledTimes(1);

    coalescer.request("t1", 1, 1);
    vi.advanceTimersByTime(50);
    expect(send).toHaveBeenCalledTimes(1);

    coalescer.request("t1", 2, 2);
    vi.advanceTimersByTime(50);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("tracks pending state per token id", () => {
    const send = vi.fn();
    const coalescer = new TokenMoveCoalescer(send, 50);
    coalescer.request("t1", 1, 1);
    coalescer.request("t2", 5, 5);
    vi.advanceTimersByTime(50);
    expect(send).toHaveBeenCalledWith("t1", 1, 1);
    expect(send).toHaveBeenCalledWith("t2", 5, 5);
  });

  it("clear() cancels pending sends and forgets lastSent", () => {
    const send = vi.fn();
    const coalescer = new TokenMoveCoalescer(send, 50);
    coalescer.request("t1", 1, 1);
    coalescer.clear();
    vi.advanceTimersByTime(100);
    expect(send).not.toHaveBeenCalled();

    coalescer.request("t1", 1, 1);
    vi.advanceTimersByTime(50);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
