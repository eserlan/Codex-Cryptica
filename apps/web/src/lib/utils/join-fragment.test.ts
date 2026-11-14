import { afterEach, describe, expect, it } from "vitest";
import { takeJoinFragment } from "./join-fragment";

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).__codexTakeJoinFragment;
  window.history.replaceState(null, "", "/");
});

describe("takeJoinFragment", () => {
  it("returns what the head script captured, once", () => {
    let held: string | null = "#a:b";
    (window as unknown as Record<string, unknown>).__codexTakeJoinFragment =
      () => {
        const taken = held;
        held = null;
        return taken;
      };
    expect(takeJoinFragment()).toBe("#a:b");
    expect(takeJoinFragment()).toBeNull();
  });

  it("falls back to location and clears the address bar", () => {
    window.history.replaceState(null, "", "/join#abc:def");
    expect(takeJoinFragment()).toBe("#abc:def");
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/join");
    expect(takeJoinFragment()).toBeNull();
  });
});
