import { describe, expect, it } from "vitest";
import {
  imageFocusBackgroundPosition,
  normalizeImageFocus,
} from "./image-focus";

describe("normalizeImageFocus", () => {
  it("accepts a known value", () => {
    expect(normalizeImageFocus("top")).toBe("top");
  });

  it("rejects unknown values", () => {
    expect(normalizeImageFocus("diagonal")).toBeUndefined();
    expect(normalizeImageFocus(undefined)).toBeUndefined();
  });
});

describe("imageFocusBackgroundPosition", () => {
  it("centers by default and for an unset focus", () => {
    expect(imageFocusBackgroundPosition(undefined)).toEqual({
      x: "50%",
      y: "50%",
    });
  });

  it("maps each edge focus to its percentage pair", () => {
    expect(imageFocusBackgroundPosition("top")).toEqual({ x: "50%", y: "0%" });
    expect(imageFocusBackgroundPosition("bottom")).toEqual({
      x: "50%",
      y: "100%",
    });
    expect(imageFocusBackgroundPosition("left")).toEqual({ x: "0%", y: "50%" });
    expect(imageFocusBackgroundPosition("right")).toEqual({
      x: "100%",
      y: "50%",
    });
  });
});
