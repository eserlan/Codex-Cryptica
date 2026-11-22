import { describe, expect, it } from "bun:test";
import {
  isCueLine,
  isSourceIdMarker,
  normalizeSectionLines,
} from "../../src/source-package/pdf-cues";
import { visualLine } from "./pdf-fixtures";

describe("PDF cue normalisation", () => {
  it.each([
    "Read aloud: Rain falls.",
    "> **GM only:** The idol moves.",
    "• **Scene condition:** The water rises.",
    "- **By talk:** Bargain with the guard.",
  ])("recognises a supported cue: %s", (text) => {
    expect(isCueLine(text)).toBe(true);
  });

  it("distinguishes prose and valid source markers from cue blocks", () => {
    expect(isCueLine("The party should read aloud the inscription.")).toBe(
      false,
    );
    expect(isSourceIdMarker("<!-- source-id: scene-1 -->")).toBe(true);
    expect(isSourceIdMarker("<!-- source-id: Scene_1 -->")).toBe(false);
    expect(isCueLine("<!-- source-id: scene-1 -->")).toBe(false);
    expect(normalizeSectionLines([])).toEqual([]);
  });

  it("joins wrapped cues and normalises motivation labels in prose", () => {
    expect(
      normalizeSectionLines([
        visualLine("Read aloud: The bell", { y: 720 }),
        visualLine("rings.", { y: 706 }),
        visualLine("GM only: A trap", { y: 680 }),
        visualLine("waits.", { y: 666 }),
        visualLine("Scene condition: The river", { y: 640 }),
        visualLine("rises.", { y: 626 }),
        visualLine("By talk: Offer", { y: 600 }),
        visualLine("a truce.", { y: 586 }),
        visualLine("Motivation: Keep the gate shut.", { y: 560 }),
      ]),
    ).toEqual([
      "> **Read aloud:** The bell rings.",
      "",
      "> **GM only:** A trap waits.",
      "",
      "- **Scene condition:** The river rises.",
      "- **By talk:** Offer a truce.",
      "**Motivation:** Keep the gate shut.",
    ]);
  });

  it("separates embedded public and GM-only cues on the same baseline", () => {
    expect(
      normalizeSectionLines([
        visualLine(
          "Prose. Read aloud: Bells ring. GM only: The idol is a mimic.",
        ),
      ]),
    ).toEqual([
      "Prose.",
      "> **Read aloud:** Bells ring.",
      "",
      "> **GM only:** The idol is a mimic.",
      "",
    ]);
  });

  it("does not continue a cue across a page, large gap, bullet, or source marker", () => {
    expect(
      normalizeSectionLines([
        visualLine("Read aloud: Rain falls.", { pageNumber: 1, y: 10 }),
        visualLine("New page.", { pageNumber: 2, y: 700 }),
        visualLine("New paragraph.", { pageNumber: 2, y: 650 }),
        visualLine("- Separate bullet.", { pageNumber: 2, y: 640 }),
        visualLine("<!-- source-id: gate -->", { pageNumber: 2, y: 630 }),
        visualLine("After marker.", { pageNumber: 2, y: 620 }),
      ]),
    ).toEqual([
      "> **Read aloud:** Rain falls.",
      "",
      "New page.",
      "New paragraph.",
      "- Separate bullet.",
      "<!-- source-id: gate -->",
      "After marker.",
    ]);
  });

  it("keeps successive read-aloud cues distinct", () => {
    expect(
      normalizeSectionLines([
        visualLine("Read aloud: First.", { y: 700 }),
        visualLine("Read aloud: Second.", { y: 690 }),
      ]),
    ).toEqual([
      "> **Read aloud:** First.",
      "",
      "> **Read aloud:** Second.",
      "",
    ]);
  });
});
