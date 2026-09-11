import { describe, expect, it, vi } from "vitest";
import {
  WELCOME_ACTIONS,
  resetWelcomeFirstClick,
  trackWelcomeFirstClick,
} from "./welcome-first-click";

const fakeStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    size: () => data.size,
  };
};

describe("trackWelcomeFirstClick", () => {
  it("emits the chosen action", () => {
    const track = vi.fn();
    const storage = fakeStorage();

    expect(trackWelcomeFirstClick("quick_start", { storage, track })).toBe(
      true,
    );
    expect(track).toHaveBeenCalledWith("welcome_first_click", {
      action: "quick_start",
    });
  });

  it("keeps the first choice and ignores later ones", () => {
    const track = vi.fn();
    const storage = fakeStorage();

    trackWelcomeFirstClick("demo", { storage, track });
    trackWelcomeFirstClick("quick_start", { storage, track });
    trackWelcomeFirstClick("open_vault", { storage, track });

    // A visitor who tries the demo, comes back, and then runs Quick Start
    // chose the demo. Overwriting would answer a different question.
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("welcome_first_click", {
      action: "demo",
    });
  });

  it("carries nothing but the action name", () => {
    const track = vi.fn();
    trackWelcomeFirstClick("graph_preview", {
      storage: fakeStorage(),
      track,
    });

    const [, payload] = track.mock.calls[0];
    expect(Object.keys(payload)).toEqual(["action"]);
  });

  it("stays silent for a visitor who already chose in an earlier session", () => {
    const track = vi.fn();
    const storage = fakeStorage({
      "codex-cryptica-welcome-first-click": "demo",
    });

    expect(trackWelcomeFirstClick("quick_start", { storage, track })).toBe(
      false,
    );
    expect(track).not.toHaveBeenCalled();
  });

  it("still reports when storage is unavailable", () => {
    const track = vi.fn();
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };

    // Some privacy modes throw on any storage access. Losing the event is
    // worse than the risk of counting this visitor twice.
    expect(trackWelcomeFirstClick("demo", { storage: throwing, track })).toBe(
      true,
    );
    expect(track).toHaveBeenCalled();
  });

  it("never lets a failing tracker break the button", () => {
    const storage = fakeStorage();
    const track = vi.fn(() => {
      throw new Error("zaraz exploded");
    });

    expect(() =>
      trackWelcomeFirstClick("open_vault", { storage, track }),
    ).not.toThrow();
  });

  it("accepts every control the welcome screen offers", () => {
    for (const action of WELCOME_ACTIONS) {
      const track = vi.fn();
      trackWelcomeFirstClick(action, { storage: fakeStorage(), track });
      expect(track).toHaveBeenCalledWith("welcome_first_click", { action });
    }
  });
});

describe("resetWelcomeFirstClick", () => {
  it("lets a visitor be counted again", () => {
    const track = vi.fn();
    const storage = fakeStorage();

    trackWelcomeFirstClick("demo", { storage, track });
    resetWelcomeFirstClick(storage);
    trackWelcomeFirstClick("quick_start", { storage, track });

    expect(track).toHaveBeenCalledTimes(2);
  });
});
