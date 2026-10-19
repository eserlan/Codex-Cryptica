import { describe, expect, test } from "bun:test";
import { normaliseText } from "../src/text";

describe("normaliseText", () => {
  test("trims and applies NFC", () => {
    expect(normaliseText("  Café  ")).toBe("Café");
  });

  test("keeps newlines and tabs", () => {
    expect(normaliseText("line one\n\tline two")).toBe("line one\n\tline two");
  });

  test("removes control, zero-width and bidi override characters", () => {
    expect(normaliseText("a\u0000b​c‮d⁦e\u0007f")).toBe("abcdef");
  });
});
