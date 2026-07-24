import { describe, it, expect } from "vitest";
import {
  parseObsidianFiles,
  parseJsonExport,
  traverseEntry,
} from "./import-parser";

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

  it("rejects a selection with no markdown files", async () => {
    const file = new File(["not markdown"], "notes.txt", {
      type: "text/plain",
    });
    await expect(parseObsidianFiles([file])).rejects.toThrow(
      /No Markdown \(\.md\) files found/,
    );
  });

  it("rejects a JSON backup with no importable pages", async () => {
    const file = new File([JSON.stringify({ pages: [] })], "empty.json", {
      type: "application/json",
    });
    await expect(parseJsonExport(file, "legendkeeper-json")).rejects.toThrow(
      /No importable articles or pages found/,
    );
  });

  it("parses a Thread Weaver export into characters, factions, and locations", async () => {
    const json = JSON.stringify({
      twe_format: "thread-weaver-campaign",
      networkData: {
        settlements: [{ id: "s1", name: "Greyhaven" }],
        factions: [{ name: "The Iron Ledger", headquarters: "s1" }],
        characters: [
          {
            id: 1,
            name: "Mira",
            faction: "The Iron Ledger",
            settlement: { id: "s1" },
          },
        ],
      },
    });
    const file = new File([json], "campaign.json", {
      type: "application/json",
    });
    const parsed = await parseJsonExport(file, "thread-weaver");

    expect(parsed.map((p) => p.type).sort()).toEqual([
      "character",
      "faction",
      "location",
    ]);
    expect(parsed.find((p) => p.type === "character")?.title).toBe("Mira");
  });

  it("parses a Scabard export into mapped entity types", async () => {
    const json = JSON.stringify({
      pages: [
        {
          id: 1,
          concept: "Character",
          page: { id: 1, name: "Hero", concept: "Character" },
        },
      ],
      conns: [],
    });
    const file = new File([json], "scabard.json", {
      type: "application/json",
    });
    const parsed = await parseJsonExport(file, "scabard");

    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Hero");
    expect(parsed[0].type).toBe("character");
  });
});

describe("traverseEntry", () => {
  const fileEntry = (name: string) => ({
    isFile: true,
    file: (cb: (f: File) => void) => cb(new File(["x"], name)),
  });

  const directoryEntry = (batches: any[][]) => {
    let call = 0;
    return {
      isDirectory: true,
      createReader: () => ({
        readEntries: (cb: (entries: any[]) => void) =>
          cb(batches[call++] ?? []),
      }),
    };
  };

  it("collects files from a nested directory", async () => {
    const dir = directoryEntry([
      [fileEntry("a.md"), directoryEntry([[fileEntry("b.md")]])],
    ]);
    const files = await traverseEntry(dir);
    expect(files.map((f) => f.name).sort()).toEqual(["a.md", "b.md"]);
  });

  it("drains multi-batch directory readers instead of stopping after one batch", async () => {
    const dir = directoryEntry([
      [fileEntry("batch1.md")],
      [fileEntry("batch2.md")],
    ]);
    const files = await traverseEntry(dir);
    expect(files.map((f) => f.name).sort()).toEqual(["batch1.md", "batch2.md"]);
  });

  it("returns no files for an unknown entry kind", async () => {
    await expect(traverseEntry({})).resolves.toEqual([]);
  });
});
