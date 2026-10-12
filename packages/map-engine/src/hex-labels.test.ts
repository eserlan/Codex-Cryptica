import { describe, expect, it } from "vitest";
import {
  axialToOffset,
  columnLettersToIndex,
  formatHexLabel,
  indexToColumnLetters,
  offsetToAxial,
  type HexLabelConfig,
} from "./hex-labels";

describe("hex-labels", () => {
  describe("column letters conversion", () => {
    it("converts 0-based column index to spreadsheet letters", () => {
      expect(indexToColumnLetters(0)).toBe("A");
      expect(indexToColumnLetters(1)).toBe("B");
      expect(indexToColumnLetters(25)).toBe("Z");
      expect(indexToColumnLetters(26)).toBe("AA");
      expect(indexToColumnLetters(27)).toBe("AB");
      expect(indexToColumnLetters(51)).toBe("AZ");
      expect(indexToColumnLetters(52)).toBe("BA");
    });

    it("converts letters to 0-based column index", () => {
      expect(columnLettersToIndex("A")).toBe(0);
      expect(columnLettersToIndex("a")).toBe(0);
      expect(columnLettersToIndex("B")).toBe(1);
      expect(columnLettersToIndex("Z")).toBe(25);
      expect(columnLettersToIndex("AA")).toBe(26);
      expect(columnLettersToIndex("AB")).toBe(27);
      expect(columnLettersToIndex("BA")).toBe(52);
    });
  });

  describe("axialToOffset & offsetToAxial", () => {
    it("converts pointy-topped axial coordinates to offset and back", () => {
      const coords = [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 0, r: 1 },
        { q: -1, r: 2 },
        { q: 3, r: -4 },
      ];

      for (const hex of coords) {
        const offset = axialToOffset(hex, "pointy");
        const roundTrip = offsetToAxial(offset.col, offset.row, "pointy");
        expect(roundTrip).toEqual(hex);
      }
    });

    it("converts flat-topped axial coordinates to offset and back", () => {
      const coords = [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 0, r: 1 },
        { q: 2, r: -1 },
        { q: -3, r: 4 },
      ];

      for (const hex of coords) {
        const offset = axialToOffset(hex, "flat");
        const roundTrip = offsetToAxial(offset.col, offset.row, "flat");
        expect(roundTrip).toEqual(hex);
      }
    });
  });

  describe("formatHexLabel", () => {
    it("returns empty string when style is 'none'", () => {
      expect(formatHexLabel({ q: 1, r: 4 }, { style: "none" })).toBe("");
    });

    it("formats axial coordinates when style is 'axial'", () => {
      expect(formatHexLabel({ q: 1, r: 4 }, { style: "axial" })).toBe("(1, 4)");
      expect(formatHexLabel({ q: -2, r: 0 }, { style: "axial" })).toBe(
        "(-2, 0)",
      );
    });

    it("formats numeric style matching legacy formatHexCoordinate", () => {
      expect(formatHexLabel({ q: 1, r: 4 }, { style: "numeric" })).toBe(
        "01.04",
      );
      expect(formatHexLabel({ q: 12, r: 3 }, { style: "numeric" })).toBe(
        "12.03",
      );
      expect(formatHexLabel({ q: -2, r: 5 }, { style: "numeric" })).toBe(
        "-02.05",
      );
      // Default style is numeric if config is undefined
      expect(formatHexLabel({ q: 1, r: 4 })).toBe("01.04");
    });

    it("formats alphanumeric style (Warlord Ascendant A01, B02, etc.)", () => {
      const config: HexLabelConfig = {
        style: "alphanumeric",
        startCol: "A",
        startRow: 1,
        rowPadding: 2,
      };

      // Pointy hexes:
      // (0, 0) -> col 0, row 0 -> A01
      expect(formatHexLabel({ q: 0, r: 0 }, config, "pointy")).toBe("A01");
      // (1, 0) -> col 1, row 0 -> B01
      expect(formatHexLabel({ q: 1, r: 0 }, config, "pointy")).toBe("B01");
      // (0, 1) -> col 0, row 1 -> A02
      expect(formatHexLabel({ q: 0, r: 1 }, config, "pointy")).toBe("A02");
      // (-1, 2) -> col 0, row 2 -> A03
      expect(formatHexLabel({ q: -1, r: 2 }, config, "pointy")).toBe("A03");
      // (1, 2) -> col 2, row 2 -> C03
      expect(formatHexLabel({ q: 1, r: 2 }, config, "pointy")).toBe("C03");
    });

    it("supports custom row padding and separator", () => {
      const config: HexLabelConfig = {
        style: "alphanumeric",
        startCol: "A",
        startRow: 1,
        rowPadding: 1,
        separator: "-",
      };

      expect(formatHexLabel({ q: 0, r: 0 }, config, "pointy")).toBe("A-1");
      expect(formatHexLabel({ q: 1, r: 2 }, config, "pointy")).toBe("C-3");

      const dotConfig: HexLabelConfig = {
        style: "alphanumeric",
        rowPadding: 2,
        separator: ".",
      };
      expect(formatHexLabel({ q: 1, r: 2 }, dotConfig, "pointy")).toBe("C.03");
    });

    it("supports custom start column and start row", () => {
      const config: HexLabelConfig = {
        style: "alphanumeric",
        startCol: "C",
        startRow: 10,
        rowPadding: 2,
      };

      // (0, 0) -> offset col 0 + startCol 'C' (index 2) = 'C' (2), row 0 + 10 = 10
      expect(formatHexLabel({ q: 0, r: 0 }, config, "pointy")).toBe("C10");
      expect(formatHexLabel({ q: 1, r: 0 }, config, "pointy")).toBe("D10");
    });

    it("supports inverted row numbering (south to north)", () => {
      const config: HexLabelConfig = {
        style: "alphanumeric",
        startRow: 10,
        invertRow: true,
      };

      // (0, 0) -> row 10
      expect(formatHexLabel({ q: 0, r: 0 }, config, "pointy")).toBe("A10");
      // (0, 1) -> row 1, invert -> 10 - 1 = 9
      expect(formatHexLabel({ q: 0, r: 1 }, config, "pointy")).toBe("A09");
    });

    it("formats flat-topped hexes accurately", () => {
      const config: HexLabelConfig = {
        style: "alphanumeric",
      };

      // Flat-topped:
      // (0, 0) -> col 0, row 0 -> A01
      expect(formatHexLabel({ q: 0, r: 0 }, config, "flat")).toBe("A01");
      // (1, 0) -> col 1, row 0 -> B01
      expect(formatHexLabel({ q: 1, r: 0 }, config, "flat")).toBe("B01");
      // (0, 1) -> col 0, row 1 -> A02
      expect(formatHexLabel({ q: 0, r: 1 }, config, "flat")).toBe("A02");
    });

    it("handles negative coordinates gracefully", () => {
      const config: HexLabelConfig = {
        style: "alphanumeric",
      };

      // West of origin (col < 0)
      expect(formatHexLabel({ q: -1, r: 0 }, config, "pointy")).toBe("-A01");
      // North of origin (row < 0, but staying in column A with q: 1)
      expect(formatHexLabel({ q: 1, r: -2 }, config, "pointy")).toBe("A-01");
    });

    it("bounds malformed persisted padding and rejects non-finite coordinates", () => {
      expect(
        formatHexLabel(
          { q: 0, r: 0 },
          { style: "alphanumeric", rowPadding: 1_000_000_000 },
        ),
      ).toBe(`A${"0".repeat(31)}1`);
      expect(
        formatHexLabel(
          { q: 0, r: 0 },
          { style: "alphanumeric", rowPadding: Number.POSITIVE_INFINITY },
        ),
      ).toBe("A01");
      expect(
        formatHexLabel(
          { q: Number.POSITIVE_INFINITY, r: 0 },
          { style: "alphanumeric" },
        ),
      ).toBe("");
    });

    it("bounds malformed persisted separators and start columns", () => {
      const oversized = "x".repeat(100_000);
      expect(
        formatHexLabel(
          { q: 0, r: 0 },
          {
            style: "alphanumeric",
            startCol: oversized,
            separator: oversized,
          },
        ),
      ).toBe("A01");
      expect(
        formatHexLabel({ q: 0, r: 0 }, { style: "invalid" as never }),
      ).toBe("");
    });
  });
});
