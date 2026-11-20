import { describe, expect, it } from "bun:test";
import { extractPageVisualLines } from "../../src/source-package/pdf-layout";
import { textItem } from "./pdf-fixtures";

describe("PDF column layout", () => {
  it("falls back to single-column reading order for short pages", () => {
    expect(
      extractPageVisualLines(
        [textItem("last", 10, 680), textItem("first", 10, 700)],
        2,
      ).map((line) => [line.text, line.pageNumber]),
    ).toEqual([
      ["first", 2],
      ["last", 2],
    ]);
    expect(extractPageVisualLines([{}, { str: " " }], 2)).toEqual([]);
  });

  it("reads the left column before the right between full-width headers and footers", () => {
    const lines = extractPageVisualLines(
      [
        textItem("Title", 10, 760, 20, 450),
        textItem("Left heading", 10, 700, 14, 140),
        textItem("Right heading", 310, 700, 14, 140),
        textItem("Left first", 10, 680, 10, 140),
        textItem("Right first", 310, 680, 10, 140),
        textItem("Left second", 10, 660, 10, 140),
        textItem("Right second", 310, 660, 10, 140),
        textItem("Footer", 10, 620, 10, 450),
      ],
      4,
    );
    expect(lines.map((line) => line.text)).toEqual([
      "Title",
      "Left heading",
      "Left first",
      "Left second",
      "Right heading",
      "Right first",
      "Right second",
      "Footer",
    ]);
    expect(lines.every((line) => line.pageNumber === 4)).toBe(true);
  });

  it("flushes both columns around an interior full-width row", () => {
    const lines = extractPageVisualLines(
      [
        textItem("Title", 10, 760, 20, 450),
        textItem("Left heading", 10, 700, 14, 140),
        textItem("Right heading", 310, 700, 14, 140),
        textItem("Shared divider", 10, 690, 10, 450),
        textItem("Read aloud: A bell rings.", 10, 670, 10, 140),
        textItem("GM only: A trap waits.", 310, 670, 10, 140),
        textItem("Left end", 10, 650, 10, 140),
        textItem("Right end", 310, 650, 10, 140),
      ],
      1,
    );
    expect(lines.map((line) => line.text)).toEqual([
      "Title",
      "Left heading",
      "Right heading",
      "Shared divider",
      "Read aloud: A bell rings.",
      "Left end",
      "GM only: A trap waits.",
      "Right end",
    ]);
  });

  it("does not infer columns from an isolated horizontal gap", () => {
    const lines = extractPageVisualLines(
      [
        textItem("Left", 10, 700, 10, 100),
        textItem("Right", 310, 700, 10, 100),
        textItem("Second", 10, 680),
        textItem("Third", 10, 660),
        textItem("Fourth", 10, 640),
      ],
      1,
    );
    expect(lines.map((line) => line.text)).toEqual([
      "Left Right",
      "Second",
      "Third",
      "Fourth",
    ]);
  });
});
