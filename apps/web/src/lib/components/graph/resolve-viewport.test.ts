import { describe, it, expect } from "vitest";
import { resolveViewport } from "./graph-view-controller.svelte";

describe("resolveViewport", () => {
  it("always fits on the initial layout pass", () => {
    expect(
      resolveViewport(true, "Load Finalized", false, false, false, true),
    ).toBe("fit");
    expect(
      resolveViewport(true, "Load Finalized", false, false, false, false),
    ).toBe("fit");
  });

  it("always fits when stableLayout is off", () => {
    expect(
      resolveViewport(false, "Elements Update", false, false, false, false),
    ).toBe("fit");
    expect(
      resolveViewport(false, "Window Resize", false, false, false, false),
    ).toBe("fit");
  });

  it("preserves the camera for plain window resizes (no reseed)", () => {
    expect(
      resolveViewport(false, "Window Resize", false, false, false, true),
    ).toBe("preserve");
  });

  it("fits when a window resize also reseeds (orientation change)", () => {
    expect(
      resolveViewport(false, "Window Resize", true, false, false, true),
    ).toBe("fit");
  });

  it("preserves the camera for edge-only element updates", () => {
    expect(
      resolveViewport(false, "Elements Update", false, false, false, true),
    ).toBe("preserve");
  });

  it("fits when new nodes are added", () => {
    expect(
      resolveViewport(false, "Elements Update", false, true, false, true),
    ).toBe("fit");
  });

  it("fits when nodes are removed", () => {
    expect(
      resolveViewport(false, "Elements Update", false, false, true, true),
    ).toBe("fit");
  });

  it("fits for mode-change and redraw callers", () => {
    expect(
      resolveViewport(false, "Mode Change Effect", false, false, false, true),
    ).toBe("fit");
    expect(
      resolveViewport(false, "UI Redraw Button", true, false, false, true),
    ).toBe("fit");
  });
});
