import { describe, expect, it } from "vitest";
import {
  axialToOffset,
  columnLettersToIndex,
  formatHexLabel,
  indexToColumnLetters,
  offsetToAxial,
  parseHexLabel,
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

  describe("parseHexLabel (T019, FR-003a)", () => {
    const cases: Array<[string, HexLabelConfig, "pointy" | "flat"]> = [
      ["numeric", { style: "numeric" }, "pointy"],
      ["numeric", { style: "numeric" }, "flat"],
      ["alphanumeric", { style: "alphanumeric" }, "pointy"],
      ["alphanumeric", { style: "alphanumeric" }, "flat"],
      [
        "alphanumeric offset",
        {
          style: "alphanumeric",
          startCol: "C",
          startRow: 4,
          rowPadding: 1,
          separator: "-",
          originQ: 2,
          originR: 3,
        },
        "pointy",
      ],
      [
        "alphanumeric inverted",
        { style: "alphanumeric", invertRow: true, startRow: 9 },
        "flat",
      ],
      ["axial", { style: "axial" }, "pointy"],
    ];

    for (const [name, config, orientation] of cases) {
      it(`round-trips ${name} (${orientation}) for a grid of hexes`, () => {
        for (let q = -6; q <= 6; q++) {
          for (let r = -6; r <= 6; r++) {
            const label = formatHexLabel({ q, r }, config, orientation);
            expect(label, `${name} ${q},${r}`).not.toBe("");
            expect(parseHexLabel(label, config, orientation)).toEqual({ q, r });
          }
        }
      });
    }

    it("ignores case and surrounding spaces for alphanumeric labels", () => {
      const config: HexLabelConfig = { style: "alphanumeric" };
      const label = formatHexLabel({ q: 1, r: 2 }, config, "pointy");
      expect(
        parseHexLabel(`  ${label.toLowerCase()} `, config, "pointy"),
      ).toEqual({ q: 1, r: 2 });
    });

    it("accepts the default numeric format when labels are hidden", () => {
      expect(parseHexLabel("01.04", { style: "none" }, "pointy")).toEqual({
        q: 1,
        r: 4,
      });
      expect(parseHexLabel("01.04", undefined, "pointy")).toEqual({
        q: 1,
        r: 4,
      });
    });

    it("returns null for empty, unknown or incomplete labels", () => {
      const config: HexLabelConfig = { style: "alphanumeric" };
      expect(parseHexLabel("", config, "pointy")).toBeNull();
      expect(parseHexLabel("   ", config, "pointy")).toBeNull();
      expect(parseHexLabel("A", config, "pointy")).toBeNull();
      expect(parseHexLabel("12", config, "pointy")).toBeNull();
      expect(parseHexLabel("01.zz", { style: "numeric" }, "pointy")).toBeNull();
      expect(parseHexLabel("(1 2)", { style: "axial" }, "pointy")).toBeNull();
    });

    it("falls back to column A when the start column is not letters", () => {
      // "B01" with an invalid start column ("A1") must behave like the default "A".
      const invalid: HexLabelConfig = { style: "alphanumeric", startCol: "A1" };
      const label = formatHexLabel({ q: 1, r: 0 }, invalid, "pointy");
      expect(parseHexLabel(label, invalid, "pointy")).toEqual({ q: 1, r: 0 });
      expect(parseHexLabel(label, { style: "alphanumeric" }, "pointy")).toEqual(
        {
          q: 1,
          r: 0,
        },
      );
    });

    it("uses the configured start row, origin and rows counted from it", () => {
      const config: HexLabelConfig = {
        style: "alphanumeric",
        startRow: 10,
        originQ: 3,
        originR: -2,
      };
      for (const hex of [
        { q: 3, r: -2 },
        { q: 4, r: -1 },
        { q: 1, r: 0 },
      ]) {
        const label = formatHexLabel(hex, config, "flat");
        expect(parseHexLabel(label, config, "flat")).toEqual(hex);
      }
    });

    it("returns null for a label that formats to a different hex", () => {
      // "A99" is a valid shape but its inverse would not re-format to the same text
      // under a numeric style, so the round-trip check must reject it.
      expect(parseHexLabel("A99", { style: "numeric" }, "pointy")).toBeNull();
    });
  });
});
