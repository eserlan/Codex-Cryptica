import { describe, it, expect } from "vitest";
import { detectFormat, parseImport } from "../../src/import";

describe("detectFormat", () => {
  it("detects one entry per line", () => {
    expect(detectFormat("alpha\nbeta\ngamma")).toBe("lines");
  });

  it("detects a Markdown table", () => {
    const md = ["| d | result |", "| --- | --- |", "| 1 | alpha |"].join("\n");
    expect(detectFormat(md)).toBe("markdown-table");
  });

  it("detects comma-separated content", () => {
    expect(detectFormat("1,alpha\n2,beta\n3,gamma")).toBe("delimited");
  });

  it("detects tab-separated content", () => {
    expect(detectFormat("1\talpha\n2\tbeta\n3\tgamma")).toBe("delimited");
  });

  it("falls back to lines for empty input", () => {
    expect(detectFormat("")).toBe("lines");
  });
});

describe("line import (FR-031)", () => {
  it("turns each line into an equal-weight entry", () => {
    const preview = parseImport("alpha\nbeta", "lines");
    expect(preview.mode).toBe("weighted");
    expect(preview.rows.map((r) => r.entry?.text)).toEqual(["alpha", "beta"]);
    expect(preview.rows.every((r) => r.entry?.weight === 1)).toBe(true);
  });

  it("skips blank lines rather than importing them", () => {
    const preview = parseImport("alpha\n\n\nbeta", "lines");
    expect(preview.rows).toHaveLength(2);
  });

  it("gives every entry a distinct id", () => {
    const preview = parseImport("a\nb\nc", "lines");
    const ids = preview.rows.map((r) => r.entry!.id);
    expect(new Set(ids).size).toBe(3);
  });
});

describe("delimited import (FR-032)", () => {
  it("recognises a range column and produces ranged mode", () => {
    const preview = parseImport("1-5,alpha\n6-10,beta", "delimited");
    expect(preview.mode).toBe("ranged");
    expect(preview.rows[0].entry?.range).toEqual({ min: 1, max: 5 });
    expect(preview.rows[1].entry?.range).toEqual({ min: 6, max: 10 });
  });

  it("recognises a weight column and produces weighted mode", () => {
    const preview = parseImport("3,alpha\n1,beta", "delimited");
    expect(preview.mode).toBe("weighted");
    expect(preview.rows.map((r) => r.entry?.weight)).toEqual([3, 1]);
  });

  it("handles tab-separated content", () => {
    const preview = parseImport("1-5\talpha\n6-10\tbeta", "delimited");
    expect(preview.rows[0].entry?.text).toBe("alpha");
  });

  it("honours quoted cells containing commas", () => {
    const preview = parseImport('1-5,"alpha, with comma"', "delimited");
    expect(preview.rows[0].entry?.text).toBe("alpha, with comma");
  });

  it("accepts an en-dash range", () => {
    const preview = parseImport("1–5,alpha\n6–10,beta", "delimited");
    expect(preview.rows[0].entry?.range).toEqual({ min: 1, max: 5 });
  });

  it("respects a caller-supplied column mapping (FR-034)", () => {
    const preview = parseImport("alpha,1-5", "delimited", {
      text: 0,
      range: 1,
    });
    expect(preview.rows[0].entry?.text).toBe("alpha");
    expect(preview.rows[0].entry?.range).toEqual({ min: 1, max: 5 });
  });
});

describe("markdown table import (FR-033)", () => {
  const md = [
    "| d100 | Result |",
    "| --- | --- |",
    "| 1-50 | a rusted blade |",
    "| 51-100 | a sealed letter |",
  ].join("\n");

  it("drops the header and alignment rows", () => {
    const preview = parseImport(md, "markdown-table");
    expect(preview.rows).toHaveLength(2);
  });

  it("reads ranges from the table", () => {
    const preview = parseImport(md, "markdown-table");
    expect(preview.rows[0].entry?.range).toEqual({ min: 1, max: 50 });
    expect(preview.rows[0].entry?.text).toBe("a rusted blade");
  });

  it("keeps reference tokens intact", () => {
    const withRef = [
      "| d | Result |",
      "| --- | --- |",
      "| 1 | A {creature} appears |",
    ].join("\n");
    const preview = parseImport(withRef, "markdown-table");
    expect(preview.rows[0].entry?.text).toBe("A {creature} appears");
  });
});

describe("bad rows never abort the batch (FR-035)", () => {
  it("flags only the offending row", () => {
    const preview = parseImport(
      "1-5,alpha\nnonsense,beta\n6-10,gamma",
      "delimited",
    );
    expect(preview.rows[0].entry).toBeDefined();
    expect(preview.rows[1].problem).toBeDefined();
    expect(preview.rows[2].entry).toBeDefined();
  });

  it("explains the problem in plain language", () => {
    const preview = parseImport(
      "1-5,alpha\nnonsense,beta\n6-10,gamma",
      "delimited",
    );
    expect(preview.rows[1].problem).toContain("range");
  });

  it("flags a row with no result text", () => {
    const preview = parseImport("1-5,alpha\n6-10,\n11-15,gamma", "delimited");
    expect(preview.rows[1].problem).toContain("No result text");
  });

  it("keeps the raw text of every row for the preview", () => {
    const preview = parseImport("1-5,alpha\nnonsense,beta", "delimited");
    expect(preview.rows.every((r) => r.raw.length > 0)).toBe(true);
  });

  it("declines to guess a range column when too few rows look like ranges", () => {
    // Ambiguous input must not be forced into ranged mode — the user can
    // always correct the mapping in the preview (FR-034).
    const preview = parseImport("1-5,alpha\nnonsense,beta", "delimited");
    expect(preview.mode).toBe("weighted");
  });

  it("imports a 100-row table without dropping anything (SC-002)", () => {
    const rows = Array.from(
      { length: 100 },
      (_, i) => `${i + 1}-${i + 1},result ${i + 1}`,
    ).join("\n");
    const preview = parseImport(rows, "delimited");
    expect(preview.rows.filter((r) => r.entry)).toHaveLength(100);
  });
});
