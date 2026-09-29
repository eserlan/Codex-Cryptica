import { describe, it, expect } from "vitest";
import { parseMarkdownToSections } from "../src/parse";
import { compileTemplate } from "../src/compile";

describe("parseMarkdownToSections", () => {
  it("turns level-2 headings into sections with the body as hint", () => {
    const r = parseMarkdownToSections("## Summary\nOne line.\n\n## Goals\n");
    expect(r.sections.map((s) => s.title)).toEqual(["Summary", "Goals"]);
    expect(r.sections[0].hint).toBe("One line.");
    expect(r.sections[1].hint).toBeUndefined();
    expect(r.intro).toBeUndefined();
  });

  it("keeps text before the first heading as intro", () => {
    const r = parseMarkdownToSections("Intro text\n\n## A\nbody");
    expect(r.intro).toBe("Intro text");
    expect(r.sections).toHaveLength(1);
  });

  it("returns nothing for an empty string", () => {
    expect(parseMarkdownToSections("")).toEqual({ sections: [] });
  });

  it("keeps deeper headings inside the parent hint (does not split)", () => {
    const r = parseMarkdownToSections("## A\n### Sub\ndetail\n## B");
    expect(r.sections).toHaveLength(2);
    expect(r.sections[0].hint).toContain("### Sub");
  });

  it("ignores headings inside code fences", () => {
    const r = parseMarkdownToSections("## A\n```\n## not a heading\n```\n");
    expect(r.sections).toHaveLength(1);
    expect(r.sections[0].hint).toContain("## not a heading");
  });

  it("gives sections unique ids", () => {
    const r = parseMarkdownToSections("## A\n## A\n## B");
    expect(new Set(r.sections.map((s) => s.id)).size).toBe(3);
  });

  it("round-trips a compiled template", () => {
    const t = {
      intro: "Hi",
      sections: [
        { id: "1", title: "A", hint: "x\ny" },
        { id: "2", title: "B" },
      ],
    };
    const r = parseMarkdownToSections(compileTemplate(t));
    expect(r.intro).toBe("Hi");
    expect(r.sections.map((s) => [s.title, s.hint])).toEqual([
      ["A", "x\ny"],
      ["B", undefined],
    ]);
  });
});
