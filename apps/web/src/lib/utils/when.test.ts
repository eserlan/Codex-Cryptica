import { describe, expect, it } from "vitest";
import { when } from "./when";

describe("when", () => {
  it("returns the value for a truthy condition", () => {
    const handler = () => "ok";
    expect(when(true, handler)).toBe(handler);
    expect(when({ id: "n" }, handler)).toBe(handler);
  });

  it("returns undefined for a falsy condition", () => {
    const handler = () => "ok";
    expect(when(false, handler)).toBeUndefined();
    expect(when(undefined, handler)).toBeUndefined();
    expect(when(0, handler)).toBeUndefined();
  });
});
