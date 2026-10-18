import { describe, expect, it } from "vitest";
import {
  layoutNoteMarkdown,
  parseNoteInline,
  parseNoteMarkdown,
} from "./note-markdown";

/** One unit per character, so widths in these tests are just lengths. */
const measureByLength = (text: string) => text.length;

describe("parseNoteInline", () => {
  it("reads bold, italic and both", () => {
    expect(parseNoteInline("a **b** c *d* e ***f***")).toEqual([
      { text: "a ", bold: false, italic: false },
      { text: "b", bold: true, italic: false },
      { text: " c ", bold: false, italic: false },
      { text: "d", bold: false, italic: true },
      { text: " e ", bold: false, italic: false },
      { text: "f", bold: true, italic: true },
    ]);
  });

  it("reads underscore emphasis the same as asterisks", () => {
    expect(parseNoteInline("__b__ _i_")).toEqual([
      { text: "b", bold: true, italic: false },
      { text: " ", bold: false, italic: false },
      { text: "i", bold: false, italic: true },
    ]);
  });

  it("leaves an unpaired marker as literal text", () => {
    expect(parseNoteInline("2 goblins * a map")).toEqual([
      { text: "2 goblins * a map", bold: false, italic: false },
    ]);
  });

  it("merges adjacent runs of the same style into one", () => {
    const runs = parseNoteInline("plain text with no markers at all");

    expect(runs).toHaveLength(1);
  });
});

describe("parseNoteMarkdown", () => {
  it("reads a heading, dropping its markers", () => {
    expect(parseNoteMarkdown("## Guard post")).toEqual([
      {
        runs: [{ text: "Guard post", bold: false, italic: false }],
        heading: true,
        bullet: false,
      },
    ]);
  });

  it("reads a bullet from any of the three markers", () => {
    const blocks = parseNoteMarkdown("- one\n* two\n+ three");

    expect(blocks.map((block) => block.bullet)).toEqual([true, true, true]);
    expect(blocks.map((block) => block.runs[0].text)).toEqual([
      "one",
      "two",
      "three",
    ]);
  });

  it("drops blank lines rather than spending a line of the note on them", () => {
    expect(parseNoteMarkdown("one\n\n\ntwo")).toHaveLength(2);
  });

  it("keeps emphasis inside a bullet", () => {
    const [block] = parseNoteMarkdown("- **2 goblins** arguing");

    expect(block.bullet).toBe(true);
    expect(block.runs[0]).toEqual({
      text: "2 goblins",
      bold: true,
      italic: false,
    });
  });
});

describe("layoutNoteMarkdown", () => {
  const layout = (body: string, maxWidth: number, maxLines = 10) =>
    layoutNoteMarkdown(parseNoteMarkdown(body), {
      maxWidth,
      maxLines,
      bulletIndent: 0,
      measure: measureByLength,
    });

  it("wraps a block across lines at the given width", () => {
    const { lines, truncated } = layout("aaa bbb ccc ddd", 7);

    expect(
      lines.map((line) => line.words.map((w) => w.text).join(" ")),
    ).toEqual(["aaa bbb", "ccc ddd"]);
    expect(truncated).toBe(false);
  });

  it("starts each block on its own line", () => {
    const { lines } = layout("one\ntwo", 100);

    expect(lines).toHaveLength(2);
  });

  it("marks the first line of a bullet and hangs the rest", () => {
    const { lines } = layout("- aaa bbb ccc", 7);

    expect(lines[0].bullet).toBe(true);
    expect(lines[0].indented).toBe(false);
    expect(lines[1].bullet).toBe(false);
    expect(lines[1].indented).toBe(true);
  });

  it("reports truncation when the body runs past the last line", () => {
    const { lines, truncated } = layout("aaa bbb ccc ddd", 7, 1);

    expect(lines).toHaveLength(1);
    expect(truncated).toBe(true);
  });

  it("does not report truncation for a body that ends on the last line", () => {
    const { truncated } = layout("aaa bbb ccc ddd", 7, 2);

    expect(truncated).toBe(false);
  });

  it("takes a word wider than the note rather than dropping it", () => {
    const { lines } = layout("supercalifragilistic", 5);

    expect(lines[0].words[0].text).toBe("supercalifragilistic");
  });

  it("carries per-word style through the wrap", () => {
    const { lines } = layout("plain **bold**", 100);
    const [plain, bold] = lines[0].words;

    expect(plain.bold).toBe(false);
    expect(bold.bold).toBe(true);
  });

  it("accounts for the bullet indent when wrapping", () => {
    const { lines } = layoutNoteMarkdown(parseNoteMarkdown("- aaa bbb"), {
      maxWidth: 7,
      maxLines: 10,
      bulletIndent: 4,
      measure: measureByLength,
    });

    // "aaa bbb" is 7 wide and would fit flush, but not once the bullet's
    // 4 units of indent are taken off the front.
    expect(lines).toHaveLength(2);
  });
});
