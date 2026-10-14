import { render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import CifPointer from "./CifPointer.svelte";
import HelpHighlightLayer from "./HelpHighlightLayer.svelte";

const rect = { top: 200, left: 100, width: 80, height: 30 };

describe("CifPointer", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is a decorative, non-interactive figure in the pointing pose", () => {
    const { getByTestId } = render(CifPointer, { rect });
    const pointer = getByTestId("cif-pointer");
    expect(pointer.getAttribute("aria-hidden")).toBe("true");
    expect(pointer.className).toContain("pointer-events-none");
    expect(getByTestId("cif-sprite").dataset.mood).toBe("pointing");
  });

  it("lands on the side of the control that has room", () => {
    const { getByTestId } = render(CifPointer, { rect });
    expect(getByTestId("cif-pointer").dataset.side).toBe("right");
  });

  it("follows the control when it moves", async () => {
    const { getByTestId, rerender } = render(CifPointer, { rect });
    await rerender({ rect: { ...rect, left: 900, width: 80 } });
    expect(getByTestId("cif-pointer").dataset.side).toBe("left");
  });
});

describe("CifPointer flight", () => {
  afterEach(() => vi.useRealTimers());

  it("waits in the corner, takes off, then stops transitioning once landed", async () => {
    vi.useFakeTimers();
    const { getByTestId } = render(CifPointer, { rect });
    const pointer = getByTestId("cif-pointer");
    const parked = pointer.style.transform;
    expect(pointer.classList.contains("landed")).toBe(false);

    await vi.advanceTimersByTimeAsync(50);
    expect(pointer.style.transform).not.toBe(parked);
    expect(pointer.classList.contains("landed")).toBe(false);

    await vi.advanceTimersByTimeAsync(700);
    expect(pointer.classList.contains("landed")).toBe(true);
  });

  it("cancels its timers when it goes away", () => {
    vi.useFakeTimers();
    const { unmount } = render(CifPointer, { rect });
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("HelpHighlightLayer with Cif", () => {
  const service = (current: unknown) =>
    ({ current, announcement: "" }) as never;

  it("sends Cif along with a highlight", () => {
    const { queryByTestId } = render(HelpHighlightLayer, {
      highlight: service({ id: 1, target: "x", label: "Here", rect }),
    });
    expect(queryByTestId("help-highlight")).not.toBeNull();
    expect(queryByTestId("cif-pointer")).not.toBeNull();
  });

  it("shows neither the ring nor Cif when there is no highlight", () => {
    const { queryByTestId } = render(HelpHighlightLayer, {
      highlight: service(null),
    });
    expect(queryByTestId("help-highlight")).toBeNull();
    expect(queryByTestId("cif-pointer")).toBeNull();
  });
});
