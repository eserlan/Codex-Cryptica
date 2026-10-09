import { describe, expect, it } from "vitest";
import { DEFAULT_REPORT_DETAIL, DEFAULT_REPORT_INCLUDE } from "./defaults";

describe("report defaults", () => {
  it("keeps GM-only content off by default", () => {
    expect(DEFAULT_REPORT_INCLUDE.gmOnlySecrets).toBe(false);
  });

  it("turns every other include option on", () => {
    const { gmOnlySecrets: _omit, ...rest } = DEFAULT_REPORT_INCLUDE;
    expect(Object.values(rest).every(Boolean)).toBe(true);
  });

  it("defaults to standard detail", () => {
    expect(DEFAULT_REPORT_DETAIL).toBe("standard");
  });
});
