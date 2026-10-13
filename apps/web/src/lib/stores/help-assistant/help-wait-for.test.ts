import { afterEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "./help-wait-for";

describe("help waitFor", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("cancels the scheduled frame and settles when aborted", async () => {
    let callback: FrameRequestCallback | undefined;
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((next: FrameRequestCallback) => {
        callback = next;
        return 17;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrame);
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");

    const pending = waitFor(() => false, 1_000, controller.signal);
    expect(callback).toBeDefined();

    controller.abort();

    await expect(pending).resolves.toBe(false);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(17);
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(callback).toBeDefined();
  });

  it("settles immediately when already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const requestAnimationFrame = vi.fn();
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);

    await expect(waitFor(() => false, 1_000, controller.signal)).resolves.toBe(
      false,
    );
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("removes the abort listener when the condition passes", async () => {
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");

    await expect(waitFor(() => true, 1_000, controller.signal)).resolves.toBe(
      true,
    );
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
  });
});
