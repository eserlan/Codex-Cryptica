import { describe, expect, it } from "vitest";
import {
  resolveGraphVisibility,
  sameGraphVisibility,
  GraphRenderActivity,
} from "./graph-visibility";

const visible = {
  documentVisible: true,
  surfaceCovered: false,
  containerIntersecting: true,
};

describe("resolveGraphVisibility", () => {
  it("keeps a visible, intersecting graph active", () => {
    expect(resolveGraphVisibility(visible)).toEqual({
      ...visible,
      suspended: false,
      reason: null,
    });
  });

  it("suspends for an explicit full-surface overlay", () => {
    expect(
      resolveGraphVisibility({ ...visible, surfaceCovered: true }),
    ).toMatchObject({
      suspended: true,
      reason: "surface-covered",
    });
  });

  it("does not confuse an ordinary sidebar with full coverage", () => {
    expect(resolveGraphVisibility(visible).suspended).toBe(false);
  });

  it("prioritizes document visibility and handles offscreen containers", () => {
    expect(
      resolveGraphVisibility({ ...visible, documentVisible: false }),
    ).toMatchObject({ suspended: true, reason: "document-hidden" });
    expect(
      resolveGraphVisibility({ ...visible, containerIntersecting: false }),
    ).toMatchObject({ suspended: true, reason: "offscreen" });
  });
});

describe("render activity", () => {
  it("accepts current callbacks and defers work while suspended", () => {
    const source = { isSuspended: false };
    const activity = new GraphRenderActivity(source);
    expect(activity.isCurrent(0)).toBe(true);
    expect(activity.deferWhileSuspended()).toBe(false);
    source.isSuspended = true;
    expect(activity.isCurrent(0)).toBe(false);
    expect(activity.deferWhileSuspended()).toBe(true);
    expect(activity.needsReconcile).toBe(true);
    source.isSuspended = false;
    activity.generation++;
    expect(activity.isCurrent(0)).toBe(false);
    expect(activity.isCurrent(1)).toBe(true);
  });

  it("compares visibility snapshots, including changes while already suspended", () => {
    const snapshot = resolveGraphVisibility(visible);
    expect(sameGraphVisibility(snapshot, { ...snapshot })).toBe(true);
    expect(
      sameGraphVisibility(snapshot, { ...snapshot, reason: "offscreen" }),
    ).toBe(false);
    const hidden = resolveGraphVisibility({
      ...visible,
      documentVisible: false,
    });
    expect(
      sameGraphVisibility(hidden, { ...hidden, surfaceCovered: true }),
    ).toBe(false);
  });
});
