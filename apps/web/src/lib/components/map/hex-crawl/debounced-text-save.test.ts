import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDebouncedTextSave } from "./debounced-text-save";

describe("createDebouncedTextSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves only the latest text once the typing pauses", () => {
    const save = vi.fn();
    const saver = createDebouncedTextSave({ save, committed: () => "" });

    saver.change("a");
    saver.change("ab");
    saver.change("abc");
    expect(save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("abc");
  });

  it("flushes immediately on flush (blur or close)", () => {
    const save = vi.fn();
    const saver = createDebouncedTextSave({ save, committed: () => "" });

    saver.change("draft");
    saver.flush();

    expect(save).toHaveBeenCalledWith("draft");
    vi.advanceTimersByTime(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("does not save text that is already committed", () => {
    const save = vi.fn();
    const saver = createDebouncedTextSave({ save, committed: () => "same" });

    saver.change("same");
    saver.flush();

    expect(save).not.toHaveBeenCalled();
  });
});
