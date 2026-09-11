import { describe, expect, it } from "vitest";
import { resolveGraphVisibility } from "./graph-visibility";

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
