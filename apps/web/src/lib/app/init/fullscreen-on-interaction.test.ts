import { describe, it, expect, vi } from "vitest";
import { initFullscreenOnFirstInteraction } from "./fullscreen-on-interaction";

function createMockDoc(overrides: Partial<Document> = {}) {
  const listeners = new Map<
    string,
    { listener: EventListener; capture: boolean }[]
  >();

  const doc = {
    fullscreenElement: null,
    documentElement: {
      requestFullscreen: vi.fn().mockResolvedValue(undefined),
    },
    addEventListener: vi.fn(
      (
        event: string,
        listener: EventListener,
        opts?: AddEventListenerOptions,
      ) => {
        const capture = !!opts?.capture;
        const existing = listeners.get(event) ?? [];
        existing.push({ listener, capture });
        listeners.set(event, existing);
      },
    ),
    removeEventListener: vi.fn(
      (event: string, listener: EventListener, opts?: EventListenerOptions) => {
        const capture = !!opts?.capture;
        const existing = listeners.get(event) ?? [];
        listeners.set(
          event,
          existing.filter(
            (entry) => entry.listener !== listener || entry.capture !== capture,
          ),
        );
      },
    ),
    dispatch(event: string) {
      const existing = listeners.get(event) ?? [];
      existing.slice().forEach(({ listener }) => listener({} as Event));
    },
    remainingListenerCount() {
      let count = 0;
      listeners.forEach((entries) => (count += entries.length));
      return count;
    },
    ...overrides,
  };

  return doc as unknown as Document & {
    documentElement: { requestFullscreen: ReturnType<typeof vi.fn> };
    dispatch: (event: string) => void;
    remainingListenerCount: () => number;
  };
}

describe("initFullscreenOnFirstInteraction", () => {
  it("registers listeners for click and keydown only", () => {
    const doc = createMockDoc();
    initFullscreenOnFirstInteraction(doc);

    const registeredEvents = vi
      .mocked(doc.addEventListener)
      .mock.calls.map(([event]) => event);
    expect(registeredEvents).toEqual(["click", "keydown"]);
  });

  it("requests fullscreen and removes all listeners on first interaction", () => {
    const doc = createMockDoc();
    initFullscreenOnFirstInteraction(doc);

    doc.dispatch("keydown");

    expect(doc.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(doc.remainingListenerCount()).toBe(0);
  });

  it("does not request fullscreen again if already fullscreen", () => {
    const doc = createMockDoc({ fullscreenElement: {} as Element });
    initFullscreenOnFirstInteraction(doc);

    doc.dispatch("click");

    expect(doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  });

  it("swallows a rejected requestFullscreen (e.g. denied or unsupported)", async () => {
    const doc = createMockDoc();
    doc.documentElement.requestFullscreen.mockRejectedValue(
      new Error("denied"),
    );
    initFullscreenOnFirstInteraction(doc);

    expect(() => doc.dispatch("click")).not.toThrow();
    await Promise.resolve();
  });

  it("requests fullscreen on the click that follows a mobile tap's touchstart", () => {
    // Regression: a mobile tap fires touchstart before click. Since this
    // module no longer listens for touchstart, that first touchstart is a
    // no-op, and the click that follows in the same tap sequence is what
    // successfully triggers fullscreen.
    const doc = createMockDoc();
    initFullscreenOnFirstInteraction(doc);

    doc.dispatch("touchstart");
    expect(doc.documentElement.requestFullscreen).not.toHaveBeenCalled();

    doc.dispatch("click");
    expect(doc.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it("returned cleanup removes all listeners without requiring an interaction", () => {
    const doc = createMockDoc();
    const cleanup = initFullscreenOnFirstInteraction(doc);

    cleanup();

    expect(doc.remainingListenerCount()).toBe(0);
    expect(doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  });
});
