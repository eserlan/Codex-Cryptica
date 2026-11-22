import { describe, expect, it } from "bun:test";
import {
  classifyHeading,
  computeBodyFontSize,
  detectHeadingLevelMap,
} from "../../src/source-package/pdf-headings";
import { visualLine } from "./pdf-fixtures";

describe("PDF heading detection", () => {
  it("weights body font sizes by character count and rounds to half points", () => {
    expect(
      computeBodyFontSize([
        visualLine("Heading", { fontSize: 20 }),
        visualLine("Another", { fontSize: 20 }),
        visualLine("A much longer paragraph determines the body size.", {
          fontSize: 10.24,
        }),
      ]),
    ).toBe(10);
    expect(computeBodyFontSize([])).toBe(10);
    expect(
      computeBodyFontSize([
        visualLine("first", { fontSize: 12 }),
        visualLine("later", { fontSize: 10 }),
      ]),
    ).toBe(12);
  });

  it("ranks larger fonts but excludes cues, source markers, long lines and ATX headings", () => {
    const levels = detectHeadingLevelMap(
      [
        visualLine("Title", { fontSize: 30 }),
        visualLine("Chapter", { fontSize: 20 }),
        visualLine("Small heading", { fontSize: 11.4 }),
        visualLine("Body", { fontSize: 11.2 }),
        visualLine("# Explicit heading", { fontSize: 40 }),
        visualLine("Read aloud: Public text.", { fontSize: 50 }),
        visualLine("GM only: Secret.", { fontSize: 50 }),
        visualLine("Scene condition: Rain.", { fontSize: 50 }),
        visualLine("By talk: Negotiate.", { fontSize: 50 }),
        visualLine("<!-- source-id: chapter -->", { fontSize: 50 }),
        visualLine("x".repeat(121), { fontSize: 60 }),
      ],
      10,
    );
    expect([...levels]).toEqual([
      [30, 1],
      [20, 2],
      [11.5, 3],
    ]);
  });

  it("caps inferred headings at level six", () => {
    const levels = detectHeadingLevelMap(
      [30, 28, 26, 24, 22, 20, 18].map((fontSize) =>
        visualLine("Heading", { fontSize }),
      ),
      10,
    );
    expect([...levels.values()]).toEqual([1, 2, 3, 4, 5, 6, 6]);
  });

  it("gives explicit ATX levels priority and strips closing markers", () => {
    expect(
      classifyHeading(visualLine("### Chapter ###"), new Map([[10, 1]])),
    ).toEqual({
      level: 3,
      title: "Chapter",
    });
  });

  it("uses rounded inferred sizes only for short non-cue lines", () => {
    const levels = new Map([[20, 2]]);
    expect(
      classifyHeading(visualLine("Chapter", { fontSize: 19.8 }), levels),
    ).toEqual({ level: 2, title: "Chapter" });
    expect(
      classifyHeading(visualLine("x".repeat(120), { fontSize: 20 }), levels)
        ?.level,
    ).toBe(2);
    for (const text of [
      "Read aloud: Rain.",
      "GM only: Hidden.",
      "<!-- source-id: scene -->",
      "x".repeat(121),
    ]) {
      expect(
        classifyHeading(visualLine(text, { fontSize: 20 }), levels),
      ).toBeNull();
    }
    expect(classifyHeading(visualLine("Body"), levels)).toBeNull();
  });
});
