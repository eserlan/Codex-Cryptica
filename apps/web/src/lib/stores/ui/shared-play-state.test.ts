import { describe, it, expect } from "vitest";
import { isSharedPlayOn } from "./shared-play-state";

const reader = (sharedMode: boolean, hosting: boolean) => ({
  sharedMode: () => sharedMode,
  hosting: () => hosting,
});

describe("isSharedPlayOn", () => {
  it("is true while Shared Mode is on", () => {
    expect(isSharedPlayOn(reader(true, false))).toBe(true);
  });

  it("is true while hosting", () => {
    expect(isSharedPlayOn(reader(false, true))).toBe(true);
  });

  it("is false when neither is on", () => {
    expect(isSharedPlayOn(reader(false, false))).toBe(false);
  });
});
