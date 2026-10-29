import { describe, expect, it } from "vitest";
import { parseInlineMarkup } from "./format";

describe("parseInlineMarkup", () => {
  it("returns an empty array for empty or falsy strings", () => {
    expect(parseInlineMarkup("")).toEqual([]);
    // @ts-expect-error test falsy input defensively
    expect(parseInlineMarkup(undefined)).toEqual([]);
  });

  it("returns a single unbolded segment when text has no bold markers", () => {
    const input = "Plain descriptive text without formatting.";
    expect(parseInlineMarkup(input)).toEqual([
      { text: "Plain descriptive text without formatting.", bold: false },
    ]);
  });

  it("correctly identifies a fully bolded string", () => {
    const input = "**Terrain:**";
    expect(parseInlineMarkup(input)).toEqual([
      { text: "Terrain:", bold: true },
    ]);
  });

  it("tokenises multiple bold segments interspersed with plain text", () => {
    const input =
      "**Terrain:** Packed track · **Signposts:** Marker stones · **Risk:** High";
    expect(parseInlineMarkup(input)).toEqual([
      { text: "Terrain:", bold: true },
      { text: " Packed track · ", bold: false },
      { text: "Signposts:", bold: true },
      { text: " Marker stones · ", bold: false },
      { text: "Risk:", bold: true },
      { text: " High", bold: false },
    ]);
  });

  it("handles bold segments at the end of a string", () => {
    const input = "Warning: **Impassable at high tide**";
    expect(parseInlineMarkup(input)).toEqual([
      { text: "Warning: ", bold: false },
      { text: "Impassable at high tide", bold: true },
    ]);
  });

  it("leaves single asterisks and unmatched formatting intact as plain text", () => {
    const input = "An asterisk * here, and **unclosed bold tag.";
    expect(parseInlineMarkup(input)).toEqual([
      { text: "An asterisk * here, and **unclosed bold tag.", bold: false },
    ]);
  });

  it("safely treats empty bold markers **** as plain text without crashing", () => {
    const input = "Prefix **** suffix";
    expect(parseInlineMarkup(input)).toEqual([
      { text: "Prefix **** suffix", bold: false },
    ]);
  });
});
