import { describe, expect, it } from "vitest";
import { splitMarkdownForCopy } from "./markdown-sections";

describe("splitMarkdownForCopy", () => {
  it("splits level-three markdown sections and keeps copy source intact", () => {
    const sections = splitMarkdownForCopy(`### Origin & Dogma
Mortals remember the wrong creation myth.

### Divine Alliances & Rivalries
- **Aster**: Betrayed the throne.`);

    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({
      heading: "Origin & Dogma",
      body: "Mortals remember the wrong creation myth.",
      markdown: "### Origin & Dogma\nMortals remember the wrong creation myth.",
    });
    expect(sections[1].markdown).toContain("### Divine Alliances & Rivalries");
    expect(sections[1].markdown).toContain("**Aster**");
  });

  it("preserves preamble content before the first heading", () => {
    const sections = splitMarkdownForCopy(`Opening note.

### Details
More text.`);

    expect(sections).toHaveLength(2);
    expect(sections[0]).toEqual({
      id: "section-preamble",
      heading: "",
      body: "Opening note.",
      markdown: "Opening note.",
    });
    expect(sections[1].heading).toBe("Details");
  });

  it("returns a single copyable section for plain markdown", () => {
    expect(splitMarkdownForCopy("Plain text.")).toEqual([
      {
        id: "section-1",
        heading: "",
        body: "Plain text.",
        markdown: "Plain text.",
      },
    ]);
  });

  it("returns no sections for empty markdown", () => {
    expect(splitMarkdownForCopy("   \n")).toEqual([]);
  });
});
