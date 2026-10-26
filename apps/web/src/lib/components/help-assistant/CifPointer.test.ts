import { render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CifFlight } from "#lib/services/help-assistant/cif-flight.svelte.js";
import CifPointer from "./CifPointer.svelte";
import HelpHighlightLayer from "./HelpHighlightLayer.svelte";

const rect = { top: 200, left: 100, width: 80, height: 30 };
// Cif's slot in the chat header, the same size as the pointer.
const header = { top: 400, left: 80, width: 44, height: 48 };

const translate = (el: HTMLElement) => {
  const [, x, y] =
    /translate\((-?[\d.]+)px, (-?[\d.]+)px\)/.exec(el.style.transform) ?? [];
  return { x: Number(x), y: Number(y) };
};

describe("CifPointer", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is a decorative, non-interactive figure in the pointing pose", () => {
    const { getByTestId } = render(CifPointer, { rect, phase: "perched" });
    const pointer = getByTestId("cif-pointer");
    expect(pointer.getAttribute("aria-hidden")).toBe("true");
    expect(pointer.className).toContain("pointer-events-none");
    expect(getByTestId("cif-sprite").dataset.mood).toBe("pointing");
  });

  it("lands on the side of the control that has room", () => {
    const { getByTestId } = render(CifPointer, { rect, phase: "perched" });
    expect(getByTestId("cif-pointer").dataset.side).toBe("right");
  });

  it("follows the control when it moves", async () => {
    const { getByTestId, rerender } = render(CifPointer, {
      rect,
      phase: "perched",
    });
    await rerender({
      rect: { ...rect, left: 900, width: 80 },
      phase: "perched",
    });
    expect(getByTestId("cif-pointer").dataset.side).toBe("left");
  });
});

describe("CifPointer flight", () => {
  afterEach(() => vi.useRealTimers());

  it("leaves from his spot in the header, then flies to the control", async () => {
    vi.useFakeTimers();
    const { getByTestId } = render(CifPointer, {
      rect,
      phase: "outbound",
      from: header,
    });
    const pointer = getByTestId("cif-pointer");
    // Exactly over the header slot, and not fading in: he is already there.
    expect(translate(pointer)).toEqual({ x: 80, y: 400 });
    expect(pointer.classList.contains("appear")).toBe(false);
    expect(pointer.classList.contains("moving")).toBe(true);

    await vi.advanceTimersByTimeAsync(50);
    expect(translate(pointer).x).toBeGreaterThan(180);
  });

  it("sets off from the corner when there is no header to leave from", () => {
    vi.stubGlobal("innerWidth", 1000);
    vi.stubGlobal("innerHeight", 800);
    const { getByTestId } = render(CifPointer, { rect, phase: "outbound" });
    const pointer = getByTestId("cif-pointer");
    expect(translate(pointer)).toEqual({ x: 1000 - 44 - 16, y: 800 - 48 - 16 });
    expect(pointer.classList.contains("appear")).toBe(true);
    vi.unstubAllGlobals();
  });

  it("flies back to the header and relaxes on the way home", async () => {
    const { getByTestId, rerender } = render(CifPointer, {
      rect,
      phase: "perched",
    });
    const pointer = getByTestId("cif-pointer");
    expect(pointer.classList.contains("landed")).toBe(true);

    await rerender({ rect, phase: "returning", home: header });
    expect(translate(pointer)).toEqual({ x: 80, y: 400 });
    expect(pointer.classList.contains("moving")).toBe(true);
    expect(getByTestId("cif-sprite").dataset.mood).toBe("idle");
  });

  it("cancels its frame when it goes away", () => {
    vi.useFakeTimers();
    const { unmount } = render(CifPointer, { rect, phase: "outbound" });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("HelpHighlightLayer with Cif", () => {
  afterEach(() => vi.useRealTimers());

  const newFlight = (reduced = false) =>
    new CifFlight({
      findHome: () => header,
      reducedMotion: () => reduced,
      flightMs: 600,
    });
  const host = (current: unknown) => ({ current, announcement: "" }) as never;

  it("sends Cif along with a highlight, out of the header", () => {
    const flight = newFlight();
    const { queryByTestId } = render(HelpHighlightLayer, {
      highlight: host({ id: 1, target: "x", label: "Here", rect }),
      flight,
    });
    expect(queryByTestId("help-highlight")).not.toBeNull();
    expect(queryByTestId("cif-pointer")?.dataset.phase).toBe("outbound");
    expect(flight.away).toBe(true);
  });

  it("shows neither the ring nor Cif when there is no highlight", () => {
    const { queryByTestId } = render(HelpHighlightLayer, {
      highlight: host(null),
      flight: newFlight(),
    });
    expect(queryByTestId("help-highlight")).toBeNull();
    expect(queryByTestId("cif-pointer")).toBeNull();
  });

  it("keeps Cif on screen while he flies home after the highlight is dismissed", async () => {
    vi.useFakeTimers();
    const flight = newFlight();
    const current = { id: 1, target: "x", label: "Here", rect };
    const { queryByTestId, rerender } = render(HelpHighlightLayer, {
      highlight: host(current),
      flight,
    });
    await vi.advanceTimersByTimeAsync(700);
    expect(queryByTestId("cif-pointer")?.dataset.phase).toBe("perched");

    await rerender({ highlight: host(null), flight });
    expect(queryByTestId("help-highlight")).toBeNull();
    expect(queryByTestId("cif-pointer")?.dataset.phase).toBe("returning");

    await vi.advanceTimersByTimeAsync(700);
    expect(queryByTestId("cif-pointer")).toBeNull();
    expect(flight.away).toBe(false);
  });

  it("restarts the flight when the same control is highlighted again", async () => {
    vi.useFakeTimers();
    const flight = newFlight();
    const first = { id: 1, target: "x", label: "Here", rect };
    const { getByTestId, rerender } = render(HelpHighlightLayer, {
      highlight: host(first),
      flight,
    });
    await vi.advanceTimersByTimeAsync(700);
    expect(getByTestId("cif-pointer").dataset.phase).toBe("perched");

    await rerender({ highlight: host({ ...first, id: 2 }), flight });
    expect(getByTestId("cif-pointer").dataset.phase).toBe("outbound");
    await vi.advanceTimersByTimeAsync(700);
    expect(getByTestId("cif-pointer").dataset.phase).toBe("perched");
  });

  it("brings Cif home when the layer goes away mid-flight, so the header is not left empty", () => {
    const flight = newFlight();
    const { unmount } = render(HelpHighlightLayer, {
      highlight: host({ id: 1, target: "x", label: "Here", rect }),
      flight,
    });
    expect(flight.away).toBe(true);
    unmount();
    expect(flight.away).toBe(false);
  });

  it("with reduced motion, shows Cif beside the control at once and removes him at once", async () => {
    const flight = newFlight(true);
    const current = { id: 1, target: "x", label: "Here", rect };
    const { queryByTestId, rerender } = render(HelpHighlightLayer, {
      highlight: host(current),
      flight,
    });
    const pointer = queryByTestId("cif-pointer")!;
    expect(pointer.dataset.phase).toBe("perched");
    expect(pointer.classList.contains("moving")).toBe(false);
    expect(translate(pointer).x).toBeGreaterThan(180);

    await rerender({ highlight: host(null), flight });
    expect(queryByTestId("cif-pointer")).toBeNull();
  });
});
