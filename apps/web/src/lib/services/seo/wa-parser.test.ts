import { describe, it, expect } from "vitest";
import {
  cleanHtml,
  cleanWaLinks,
  mapWaTemplate,
  parseWaExport,
} from "./wa-parser";

describe("cleanHtml", () => {
  it("converts <br> to newline", () => {
    expect(cleanHtml("line1<br>line2")).toBe("line1\nline2");
    expect(cleanHtml("line1<br/>line2")).toBe("line1\nline2");
  });

  it("converts <p> tags to paragraph breaks", () => {
    expect(cleanHtml("<p>Hello</p><p>World</p>")).toBe("Hello\n\nWorld");
  });

  it("converts bold and italic", () => {
    expect(cleanHtml("<strong>bold</strong>")).toBe("**bold**");
    expect(cleanHtml("<b>bold</b>")).toBe("**bold**");
    expect(cleanHtml("<em>italic</em>")).toBe("*italic*");
    expect(cleanHtml("<i>italic</i>")).toBe("*italic*");
  });

  it("converts headings", () => {
    expect(cleanHtml("<h2>Section</h2>")).toBe("## Section");
    expect(cleanHtml("<h3>Sub</h3>")).toBe("### Sub");
  });

  it("converts anchor tags to markdown links", () => {
    expect(cleanHtml('<a href="https://example.com">Link</a>')).toBe(
      "[Link](https://example.com)",
    );
  });

  it("strips unknown HTML tags", () => {
    expect(cleanHtml("<div><span>text</span></div>")).toBe("text");
  });

  it("collapses excessive blank lines", () => {
    const input = "line1\n\n\n\nline2";
    expect(cleanHtml(input)).toBe("line1\n\nline2");
  });

  it("returns empty string for falsy input", () => {
    expect(cleanHtml("")).toBe("");
  });
});

describe("cleanWaLinks", () => {
  it("converts [article:UUID|Title] to [[Title]]", () => {
    expect(cleanWaLinks("[article:abc-123|The Dragon Queen]")).toBe(
      "[[The Dragon Queen]]",
    );
  });

  it("removes bare [article:UUID] without display text", () => {
    expect(cleanWaLinks("[article:abc-123]")).toBe("");
  });

  it("converts [url:href|Text] to markdown link", () => {
    expect(cleanWaLinks("[url:https://example.com|Example]")).toBe(
      "[Example](https://example.com)",
    );
  });

  it("converts @[Title](article:UUID) to [[Title]]", () => {
    expect(cleanWaLinks("@[The Frost King](article:uuid-456)")).toBe(
      "[[The Frost King]]",
    );
  });

  it("leaves plain text untouched", () => {
    const text = "A warrior of great renown.";
    expect(cleanWaLinks(text)).toBe(text);
  });

  it("handles multiple links in one string", () => {
    const result = cleanWaLinks("See [article:a|Elf] and @[Dwarf](article:b).");
    expect(result).toBe("See [[Elf]] and [[Dwarf]].");
  });
});

describe("mapWaTemplate", () => {
  it.each([
    ["character", "character"],
    ["npc", "character"],
    ["person", "character"],
    ["creature", "creature"],
    ["monster", "creature"],
    ["location", "location"],
    ["settlement", "location"],
    ["landmark", "location"],
    ["item", "item"],
    ["weapon", "item"],
    ["vehicle", "item"],
    ["event", "event"],
    ["myth", "event"],
    ["organization", "faction"],
    ["faction", "faction"],
    ["military", "faction"],
    ["", "note"],
    ["unknown-template", "note"],
  ])("maps '%s' → '%s'", (template, expected) => {
    expect(mapWaTemplate(template)).toBe(expected);
  });
});

describe("parseWaExport", () => {
  it("parses an array of articles", () => {
    const raw = [
      {
        title: "Valen Frost",
        body: "<p>A brave warrior.</p>",
        template: "character",
      },
    ];
    const result = parseWaExport(raw);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Valen Frost");
    expect(result[0].type).toBe("character");
    expect(result[0].content).toBe("A brave warrior.");
    expect(result[0].labels).toContain("world-anvil-import");
  });

  it("parses { articles: [...] } shape", () => {
    const raw = {
      articles: [{ title: "Ironkeep", template: "settlement" }],
    };
    const result = parseWaExport(raw);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("location");
  });

  it("falls back to Object.values for arbitrary object exports", () => {
    const raw = {
      "abc-1": { title: "The Void", template: "location" },
      "abc-2": { title: "The Pact", template: "organization" },
    };
    const result = parseWaExport(raw);
    expect(result).toHaveLength(2);
  });

  it("uses title fallback for unnamed articles", () => {
    const result = parseWaExport([{ body: "Some lore." }]);
    expect(result[0].title).toBe("Untitled Article");
  });

  it("converts WA internal links in content", () => {
    const raw = [
      {
        title: "History",
        body: "See [article:uuid-1|The Dragon Queen] for more.",
        template: "note",
      },
    ];
    const result = parseWaExport(raw);
    expect(result[0].content).toBe("See [[The Dragon Queen]] for more.");
  });

  it("skips non-object entries", () => {
    const result = parseWaExport([null, undefined, "string", { title: "OK" }]);
    expect(result).toHaveLength(1);
  });

  it("returns empty array for null input", () => {
    expect(parseWaExport(null)).toEqual([]);
  });

  it("includes template in labels", () => {
    const result = parseWaExport([{ title: "Elf", template: "character" }]);
    expect(result[0].labels).toEqual(["world-anvil-import", "character"]);
  });
});
