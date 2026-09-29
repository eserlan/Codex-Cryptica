import { describe, it, expect } from "vitest";
import { compileTemplate } from "../src/compile";

describe("compileTemplate", () => {
  it("emits headings with hints, separated by blank lines", () => {
    const md = compileTemplate({
      sections: [
        { id: "a", title: "Summary", hint: "One line." },
        { id: "b", title: "Secrets", hint: "What they hide." },
      ],
    });
    expect(md).toBe(
      "## Summary\n\nOne line.\n\n## Secrets\n\nWhat they hide.\n",
    );
  });

  it("emits only the heading when there is no hint", () => {
    expect(
      compileTemplate({
        sections: [
          { id: "a", title: "A" },
          { id: "b", title: "B", hint: "   " },
        ],
      }),
    ).toBe("## A\n\n## B\n");
  });

  it("puts the intro first", () => {
    expect(
      compileTemplate({
        intro: "Read me.",
        sections: [{ id: "a", title: "A", hint: "x" }],
      }),
    ).toBe("Read me.\n\n## A\n\nx\n");
  });

  it("returns an empty string for an empty template", () => {
    expect(compileTemplate({ sections: [] })).toBe("");
  });

  it("is deterministic and keeps markdown in hints verbatim", () => {
    const t = {
      sections: [{ id: "a", title: "A", hint: "- one\n- **two**" }],
    };
    expect(compileTemplate(t)).toBe(compileTemplate(t));
    expect(compileTemplate(t)).toContain("- one\n- **two**");
  });
});
