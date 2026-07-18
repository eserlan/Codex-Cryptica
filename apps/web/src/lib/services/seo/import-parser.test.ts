import { describe, it, expect } from "vitest";
import { parseObsidianFiles, parseJsonExport } from "./import-parser";

describe("import-parser", () => {
  it("parses Obsidian frontmatter correctly", async () => {
    const content =
      "---\ntitle: My Hero\ntype: character\ntags: [tag1]\n---\nBody text";
    const file = new File([content], "hero.md", { type: "text/markdown" });
    const parsed = await parseObsidianFiles([file]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("My Hero");
    expect(parsed[0].type).toBe("character");
    expect(parsed[0].content).toBe("Body text");
    expect(parsed[0].labels).toContain("tag1");
    expect(parsed[0].labels).toContain("obsidian-import");
  });

  it("parses LegendKeeper JSON correctly", async () => {
    const json = JSON.stringify({
      pages: [{ name: "The Kingdom", content: "Lore here" }],
    });
    const file = new File([json], "lk.json", { type: "application/json" });
    const parsed = await parseJsonExport(file, "legendkeeper-json");

    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("The Kingdom");
    expect(parsed[0].type).toBe("note");
    expect(parsed[0].content).toBe("Lore here");
    expect(parsed[0].labels).toContain("legendkeeper-import");
  });
});
