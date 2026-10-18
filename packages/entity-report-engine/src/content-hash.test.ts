import { describe, expect, it } from "vitest";
import { hashReportContent } from "./content-hash";

describe("hashReportContent", () => {
  it("is deterministic", () => {
    expect(hashReportContent("## Overview")).toBe(
      hashReportContent("## Overview"),
    );
  });

  it("changes when a single character changes", () => {
    expect(hashReportContent("Vargas")).not.toBe(hashReportContent("Vargaz"));
  });

  it("handles the empty string", () => {
    expect(hashReportContent("")).toMatch(/^[0-9a-f]{8}$/);
  });
});
