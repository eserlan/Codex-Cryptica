import { describe, expect, it } from "bun:test";
import {
  appendRowLine,
  buildVisualLinesFromItems,
  extractPositionedItems,
  groupItemsByY,
  type VisualLine,
} from "../../src/source-package/pdf-text-lines";
import { textItem } from "./pdf-fixtures";

describe("PDF text lines", () => {
  it("ignores missing and blank text items", () => {
    expect(extractPositionedItems([{}, { str: "" }, { str: " \n " }])).toEqual(
      [],
    );
    expect(buildVisualLinesFromItems([], 1)).toEqual([]);
  });

  it("resolves missing metrics and preserves explicit zero width", () => {
    expect(
      extractPositionedItems([
        { str: "plain" },
        { str: "small", transform: [0, 0], height: 8, width: -1 },
        {
          str: "rotated",
          transform: [6, 8, 0, 0, 42, 500],
          height: 20,
          width: 0,
        },
      ]),
    ).toEqual([
      { str: "plain", x: 0, y: 0, fontSize: 10, width: 25, height: 10 },
      { str: "small", x: 0, y: 0, fontSize: 8, width: 20, height: 8 },
      { str: "rotated", x: 42, y: 500, fontSize: 10, width: 0, height: 20 },
    ]);
  });

  it("groups nearby baselines in reading order without sorting the input", () => {
    const items = extractPositionedItems([
      textItem("lower", 10, 680),
      textItem("right", 50, 698),
      textItem("left", 10, 700),
    ]);
    const original = [...items];
    expect(
      groupItemsByY(items).map((row) => row.map((item) => item.str)),
    ).toEqual([["left", "right"], ["lower"]]);
    expect(items).toEqual(original);
  });

  it("joins fragments using their spacing and a character-weighted font size", () => {
    const lines = buildVisualLinesFromItems(
      extractPositionedItems([
        textItem("world  ", 50, 700, 20, 50),
        textItem("  Hello", 10, 700, 10, 35),
      ]),
      3,
    );
    expect(lines).toEqual([
      { text: "Hello world", fontSize: 15, pageNumber: 3, x: 10, y: 700 },
    ]);
  });

  it("keeps touching fragments together and normalises quotes and whitespace", () => {
    const lines = buildVisualLinesFromItems(
      extractPositionedItems([
        textItem("Read", 0, 700, 10, 20),
        textItem("ing", 20, 700, 10, 15),
        textItem(" ‘aloud’  “now” ", 35, 700),
      ]),
      1,
    );
    expect(lines[0]?.text).toBe("Reading 'aloud' \"now\"");
  });

  it("does not append a row that normalises to empty text", () => {
    const lines: VisualLine[] = [];
    appendRowLine(
      [{ str: "  ", x: 0, y: 700, width: 10, height: 10, fontSize: 10 }],
      1,
      lines,
    );
    expect(lines).toEqual([]);
  });
});
