import { describe, it, expect, vi } from "vitest";
import { registerFlushSavesOnHide } from "./flush-saves-on-hide";

/**
 * Regression cover for #2584: debounced entity writes were lost when the app
 * closed inside the 400ms debounce window, because nothing drained the queue on
 * the way out.
 */

function harness(visibilityState: DocumentVisibilityState = "visible") {
  const winListeners = new Map<string, EventListener>();
  const docListeners = new Map<string, EventListener>();
  const state = { visibilityState };

  const flushPendingSaves = vi.fn().mockResolvedValue(undefined);

  const cleanup = registerFlushSavesOnHide({
    flushPendingSaves,
    window: {
      addEventListener: ((type: string, fn: EventListener) => {
        winListeners.set(type, fn);
      }) as Window["addEventListener"],
      removeEventListener: ((type: string) => {
        winListeners.delete(type);
      }) as Window["removeEventListener"],
    },
    document: {
      addEventListener: ((type: string, fn: EventListener) => {
        docListeners.set(type, fn);
      }) as Document["addEventListener"],
      removeEventListener: ((type: string) => {
        docListeners.delete(type);
      }) as Document["removeEventListener"],
      get visibilityState() {
        return state.visibilityState;
      },
    } as unknown as Document,
  });

  return { winListeners, docListeners, state, flushPendingSaves, cleanup };
}

describe("registerFlushSavesOnHide", () => {
  it("flushes when the page is hidden", () => {
    const h = harness();
    h.state.visibilityState = "hidden";
    h.docListeners.get("visibilitychange")?.(new Event("visibilitychange"));
    expect(h.flushPendingSaves).toHaveBeenCalledTimes(1);
  });

  it("flushes on pagehide", () => {
    const h = harness();
    h.winListeners.get("pagehide")?.(new Event("pagehide"));
    expect(h.flushPendingSaves).toHaveBeenCalledTimes(1);
  });

  it("does not flush when the page merely becomes visible again", () => {
    // Returning to the tab must not trigger a pointless write storm.
    const h = harness();
    h.state.visibilityState = "visible";
    h.docListeners.get("visibilitychange")?.(new Event("visibilitychange"));
    expect(h.flushPendingSaves).not.toHaveBeenCalled();
  });

  it("flushes on every hide, not only the first", () => {
    const h = harness();
    h.state.visibilityState = "hidden";
    h.docListeners.get("visibilitychange")?.(new Event("visibilitychange"));
    h.docListeners.get("visibilitychange")?.(new Event("visibilitychange"));
    expect(h.flushPendingSaves).toHaveBeenCalledTimes(2);
  });

  it("removes both listeners on cleanup", () => {
    const h = harness();
    h.cleanup();
    expect(h.winListeners.has("pagehide")).toBe(false);
    expect(h.docListeners.has("visibilitychange")).toBe(false);
  });

  it("swallows a rejected flush rather than surfacing it during teardown", async () => {
    const flushPendingSaves = vi.fn().mockRejectedValue(new Error("OPFS gone"));
    const winListeners = new Map<string, EventListener>();
    registerFlushSavesOnHide({
      flushPendingSaves,
      window: {
        addEventListener: ((type: string, fn: EventListener) => {
          winListeners.set(type, fn);
        }) as Window["addEventListener"],
        removeEventListener: (() => {}) as Window["removeEventListener"],
      },
      document: {
        addEventListener: () => {},
        removeEventListener: () => {},
        visibilityState: "visible",
      } as unknown as Document,
    });

    expect(() =>
      winListeners.get("pagehide")?.(new Event("pagehide")),
    ).not.toThrow();
    await Promise.resolve();
    expect(flushPendingSaves).toHaveBeenCalled();
  });

  it("swallows a synchronous throw from flushPendingSaves", () => {
    const winListeners = new Map<string, EventListener>();
    registerFlushSavesOnHide({
      flushPendingSaves: () => {
        throw new Error("boom");
      },
      window: {
        addEventListener: ((type: string, fn: EventListener) => {
          winListeners.set(type, fn);
        }) as Window["addEventListener"],
        removeEventListener: (() => {}) as Window["removeEventListener"],
      },
      document: {
        addEventListener: () => {},
        removeEventListener: () => {},
        visibilityState: "visible",
      } as unknown as Document,
    });

    expect(() =>
      winListeners.get("pagehide")?.(new Event("pagehide")),
    ).not.toThrow();
  });

  it("falls back to the real window and document when none are injected", () => {
    // The production call site passes only flushPendingSaves; verify the
    // globals are picked up and, crucially, released again on cleanup.
    const flushPendingSaves = vi.fn().mockResolvedValue(undefined);
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const cleanup = registerFlushSavesOnHide({ flushPendingSaves });
    expect(addSpy).toHaveBeenCalledWith("pagehide", expect.any(Function));

    window.dispatchEvent(new Event("pagehide"));
    expect(flushPendingSaves).toHaveBeenCalledTimes(1);

    cleanup();
    expect(removeSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );

    // After cleanup the handler must be gone, or repeated mounts would stack.
    window.dispatchEvent(new Event("pagehide"));
    expect(flushPendingSaves).toHaveBeenCalledTimes(1);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
