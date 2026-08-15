import { describe, expect, it } from "vitest";

import {
  EXPORT_FORMATS,
  exportFilename,
  exportSource,
  imageCount,
  referencedNames,
  looksLikeCodexFile,
  parseCodexImport,
  type RandomSource,
} from "../../src";

const table: RandomSource = {
  id: "tbl-1",
  name: "Tavern Rumours",
  kind: "table",
  labels: ["town", "social"],
  selection: { mode: "weighted" },
  entries: [
    { id: "e1", text: "The miller is missing.", weight: 3 },
    { id: "e2", text: "A {creature} was seen at the ford.", weight: 1 },
  ],
};

const rangedTable: RandomSource = {
  id: "tbl-2",
  name: "Weather",
  kind: "table",
  labels: [],
  selection: { mode: "ranged", die: { sides: 100 } },
  entries: [
    { id: "e1", text: "Clear.", range: { min: 1, max: 70 } },
    { id: "e2", text: "Storm.", range: { min: 71, max: 100 } },
  ],
};

const deck: RandomSource = {
  id: "dck-1",
  name: "Omens",
  kind: "deck",
  labels: ["oracle"],
  deckOptions: { drawMode: "without-replacement", allowReversals: true },
  spreads: [
    { id: "s1", name: "Three Fates", positions: ["Past", "Present", "Future"] },
  ],
  cards: [
    {
      id: "c1",
      title: "The Tower",
      body: "Sudden ruin.",
      reversedMeaning: "Ruin averted.",
      imagePath: "images/tower.webp",
    },
    { id: "c2", title: "The Star", body: "Hope worth walking to." },
  ],
};

describe("export", () => {
  describe("codex format", () => {
    // The whole point of the lossless format: what leaves can come back.
    it("round-trips a table through import without losing anything", () => {
      const file = exportSource(table, "codex");
      const back = parseCodexImport(file.content, "new-id");

      expect(back.ok).toBe(true);
      if (!back.ok) return;
      expect(back.source).toEqual({ ...table, id: "new-id" });
    });

    it("round-trips a ranged table, die and all", () => {
      const back = parseCodexImport(
        exportSource(rangedTable, "codex").content,
        "new-id",
      );

      expect(back.ok).toBe(true);
      if (!back.ok) return;
      expect(back.source.selection).toEqual({
        mode: "ranged",
        die: { sides: 100 },
      });
      expect(back.source.entries?.[1].range).toEqual({ min: 71, max: 100 });
    });

    it("round-trips a deck with its spreads, reversals and image paths", () => {
      const back = parseCodexImport(
        exportSource(deck, "codex").content,
        "new-id",
      );

      expect(back.ok).toBe(true);
      if (!back.ok) return;
      expect(back.source).toEqual({ ...deck, id: "new-id" });
      expect(back.cardCount).toBe(2);
      expect(back.imagePaths).toEqual(["images/tower.webp"]);
    });

    /**
     * A copy, not a replacement. Re-importing into the vault it came from must
     * not silently overwrite the source still sitting there.
     */
    it("gives the copy a new id and keeps the ids inside it", () => {
      const back = parseCodexImport(
        exportSource(deck, "codex").content,
        "fresh",
      );

      expect(back.ok).toBe(true);
      if (!back.ok) return;
      expect(back.source.id).toBe("fresh");
      expect(back.source.cards?.map((c) => c.id)).toEqual(["c1", "c2"]);
    });

    it("reports a file it cannot read instead of throwing", () => {
      const back = parseCodexImport("not a codex file", "id");

      expect(back.ok).toBe(false);
      if (back.ok) return;
      expect(back.error).toBeTruthy();
    });
  });

  describe("looksLikeCodexFile", () => {
    it("recognises what this app exports", () => {
      expect(looksLikeCodexFile(exportSource(table, "codex").content)).toBe(
        true,
      );
      expect(looksLikeCodexFile(exportSource(deck, "codex").content)).toBe(
        true,
      );
    });

    it("leaves the shapes the paste importer handles alone", () => {
      expect(looksLikeCodexFile("one\ntwo\nthree")).toBe(false);
      expect(looksLikeCodexFile("| roll | result |\n| --- | --- |")).toBe(
        false,
      );
      expect(looksLikeCodexFile("1\tClear\n2\tStorm")).toBe(false);
    });

    // Frontmatter alone is not enough — plenty of Markdown has it.
    it("wants a kind, not just a frontmatter block", () => {
      expect(looksLikeCodexFile("---\ntitle: Notes\n---\n\nSome prose.")).toBe(
        false,
      );
    });
  });

  describe("share formats", () => {
    it("writes a weighted table as a Markdown table", () => {
      const file = exportSource(table, "markdown-table");

      expect(file.filename).toBe("tavern-rumours.md");
      expect(file.content).toBe(
        [
          "| Weight | Result |",
          "| --- | --- |",
          "| 3 | The miller is missing. |",
          "| 1 | A {creature} was seen at the ford. |",
          "",
        ].join("\n"),
      );
    });

    it("writes a ranged table with its die numbers", () => {
      const content = exportSource(rangedTable, "markdown-table").content;

      expect(content).toContain("| Roll | Result |");
      expect(content).toContain("| 1-70 | Clear. |");
      expect(content).toContain("| 71-100 | Storm. |");
    });

    // Tabs, because entry text is prose full of commas and the paste importer
    // has no quoted-field handling to survive them.
    it("separates with tabs, not commas", () => {
      const content = exportSource(table, "delimited").content;

      expect(content.split("\n")[0]).toBe("weight\tresult");
      expect(content).toContain("3\tThe miller is missing.");
      expect(exportSource(table, "delimited").filename).toBe(
        "tavern-rumours.tsv",
      );
    });

    it("writes plain lines as just the text", () => {
      expect(exportSource(table, "lines").content).toBe(
        "The miller is missing.\nA {creature} was seen at the ford.\n",
      );
    });

    it("pairs a card with its meaning in plain lines", () => {
      expect(exportSource(deck, "lines").content).toBe(
        "The Tower — Sudden ruin.\nThe Star — Hope worth walking to.\n",
      );
    });

    it("carries a card's reversed meaning into the shared table", () => {
      const content = exportSource(deck, "markdown-table").content;

      expect(content).toContain("| Card | Meaning | Reversed |");
      expect(content).toContain("| The Tower | Sudden ruin. | Ruin averted. |");
    });

    // A pipe in the text would otherwise split the row into a new column.
    it("escapes a pipe rather than breaking the table", () => {
      const withPipe: RandomSource = {
        ...table,
        entries: [{ id: "e1", text: "a | b", weight: 1 }],
      };

      expect(exportSource(withPipe, "markdown-table").content).toContain(
        "| a \\| b |",
      );
    });

    // A newline inside an entry would break both a table row and a TSV line.
    it("flattens a multi-line entry onto one line", () => {
      const multiline: RandomSource = {
        ...table,
        entries: [{ id: "e1", text: "first\nsecond", weight: 1 }],
      };

      expect(exportSource(multiline, "delimited").content).toContain(
        "1\tfirst second",
      );
    });

    it("writes an empty source without a stray blank line", () => {
      const empty: RandomSource = { ...table, entries: [] };

      expect(exportSource(empty, "lines").content).toBe("");
    });
  });

  describe("exportFilename", () => {
    it("slugifies a name", () => {
      expect(exportFilename("Tavern Rumours", ".md")).toBe("tavern-rumours.md");
    });

    it("drops characters a filesystem would refuse", () => {
      expect(exportFilename("What/Now? <>", ".txt")).toBe("whatnow.txt");
    });

    it("falls back rather than producing a bare extension", () => {
      expect(exportFilename("???", ".md")).toBe("source.md");
      expect(exportFilename("   ", ".md")).toBe("source.md");
    });
  });

  describe("what a reader would not get", () => {
    /**
     * References bind by name, so one table of a nested set resolves to
     * nothing on the other end. Naming them is the least this can do.
     */
    it("names the sources a table pulls in", () => {
      expect(referencedNames(table)).toEqual(["creature"]);
    });

    it("names references from a card's body and its reversed meaning", () => {
      const referencing: RandomSource = {
        ...deck,
        cards: [
          { id: "c1", title: "A", body: "see {beasts}" },
          { id: "c2", title: "B", body: "x", reversedMeaning: "see {omens}" },
        ],
      };

      expect(referencedNames(referencing)).toEqual(["beasts", "omens"]);
    });

    it("lists each name once, in a stable order", () => {
      const repeated: RandomSource = {
        ...table,
        entries: [
          { id: "e1", text: "{zeta} and {alpha}", weight: 1 },
          { id: "e2", text: "{alpha} again", weight: 1 },
        ],
      };

      expect(referencedNames(repeated)).toEqual(["alpha", "zeta"]);
    });

    it("says nothing for a source that stands alone", () => {
      expect(referencedNames(rangedTable)).toEqual([]);
    });

    // Art lives in the vault; no text format can carry it.
    it("counts the cards whose art would not travel", () => {
      expect(imageCount(deck)).toBe(1);
      expect(imageCount(table)).toBe(0);
    });
  });

  it("offers exactly one lossless format", () => {
    const lossless = EXPORT_FORMATS.filter((f) => f.lossless);

    expect(lossless.map((f) => f.id)).toEqual(["codex"]);
  });
});
