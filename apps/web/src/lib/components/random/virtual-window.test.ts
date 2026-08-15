import { describe, expect, it } from "vitest";
import { computeWindow } from "./virtual-window";

describe("computeWindow", () => {
  const base = { rowHeight: 50, viewportHeight: 500, overscan: 2 };

  it("renders nothing for an empty list", () => {
    const w = computeWindow({ ...base, itemCount: 0, scrollTop: 0 });
    expect(w).toEqual({
      start: 0,
      end: 0,
      paddingTop: 0,
      paddingBottom: 0,
      totalHeight: 0,
    });
  });

  it("starts at the top without a negative index", () => {
    const w = computeWindow({ ...base, itemCount: 1000, scrollTop: 0 });
    expect(w.start).toBe(0);
    expect(w.paddingTop).toBe(0);
  });

  it("windows a 1,000-entry table down to a small slice", () => {
    const w = computeWindow({ ...base, itemCount: 1000, scrollTop: 5000 });
    expect(w.end - w.start).toBeLessThan(30);
    expect(w.start).toBe(98);
    expect(w.paddingTop).toBe(4900);
  });

  it("keeps the spacers summing to the full list height", () => {
    const w = computeWindow({ ...base, itemCount: 1000, scrollTop: 5000 });
    const rendered = (w.end - w.start) * base.rowHeight;
    expect(w.paddingTop + rendered + w.paddingBottom).toBe(w.totalHeight);
  });

  it("never runs past the end of the list", () => {
    const w = computeWindow({ ...base, itemCount: 20, scrollTop: 100_000 });
    expect(w.end).toBe(20);
    expect(w.paddingBottom).toBe(0);
  });

  it("covers the whole list when it fits in the viewport", () => {
    const w = computeWindow({ ...base, itemCount: 5, scrollTop: 0 });
    expect(w.start).toBe(0);
    expect(w.end).toBe(5);
  });
});
