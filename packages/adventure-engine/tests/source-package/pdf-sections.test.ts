import { describe, expect, it } from "bun:test";
import { buildRawSectionsFromLines } from "../../src/source-package/pdf-sections";
import { visualLine } from "./pdf-fixtures";

describe("PDF section assembly", () => {
  it("preserves heading levels, absolute line numbers and page ranges", () => {
    const result = buildRawSectionsFromLines(
      [
        visualLine("# The Vault", { y: 720 }),
        visualLine("An old vault.", { y: 700 }),
        visualLine("## Scene 1: Gate", { y: 670 }),
        visualLine("Read aloud: A bell rings.", { y: 650 }),
        visualLine("GM only: A trap waits.", { pageNumber: 2, y: 720 }),
        visualLine("## Scene 2: Hall", { pageNumber: 3, y: 720 }),
        visualLine("The hall is empty.", { pageNumber: 3, y: 700 }),
      ],
      "vault.pdf",
    );
    expect(result.ambiguities).toEqual([]);
    expect(result.rawSections).toEqual([
      {
        level: 1,
        title: "The Vault",
        lines: ["An old vault."],
        lineNumber: 1,
        pageNumber: 1,
      },
      {
        level: 2,
        title: "Scene 1: Gate",
        lines: [
          "> **Read aloud:** A bell rings.",
          "",
          "> **GM only:** A trap waits.",
          "",
        ],
        lineNumber: 3,
        pageNumber: 1,
        pageEnd: 2,
      },
      {
        level: 2,
        title: "Scene 2: Hall",
        lines: ["The hall is empty."],
        lineNumber: 6,
        pageNumber: 3,
      },
    ]);
  });

  it("retains all preamble text in an unresolved introduction with a bounded preview", () => {
    const preamble = "The travellers gather. ".repeat(15) + "Unique tail.";
    const result = buildRawSectionsFromLines(
      [
        visualLine(preamble, { pageNumber: 2 }),
        visualLine("Second page of introduction.", { pageNumber: 3 }),
        visualLine("# Chapter", { pageNumber: 4 }),
      ],
      "book.pdf",
    );
    expect(result.rawSections[0]).toEqual({
      level: 1,
      title: "Introduction",
      lines: [preamble, "Second page of introduction."],
      lineNumber: 1,
      pageNumber: 2,
      pageEnd: 3,
      forceUnresolvedProvenance: true,
    });
    expect(result.ambiguities).toEqual([
      {
        id: "amb-unanchored-preamble",
        code: "UNANCHORED_PREAMBLE",
        message:
          "Document contains text before the first heading; it was preserved in an unresolved introductory section.",
        context: preamble.slice(0, 200),
        provenance: "unresolved",
      },
    ]);
    expect(result.rawSections[1]?.lineNumber).toBe(3);
    expect(result.rawSections[1]).not.toHaveProperty("pageEnd");
  });

  it("uses one unresolved fallback section for a headingless multi-page PDF", () => {
    const result = buildRawSectionsFromLines(
      [
        visualLine("A caravan reaches the ford.", { pageNumber: 2 }),
        visualLine("The bridge is gone.", { pageNumber: 3 }),
      ],
      "/tmp/Some Name.PDF",
    );
    expect(result.rawSections).toEqual([
      {
        level: 1,
        title: "Some Name",
        lines: ["A caravan reaches the ford.", "The bridge is gone."],
        lineNumber: 1,
        pageNumber: 2,
        pageEnd: 3,
        forceUnresolvedProvenance: true,
      },
    ]);
    expect(result.ambiguities).toEqual([
      {
        id: "amb-missing-heading-pdf",
        code: "MISSING_HEADING",
        message:
          "No section headings were detected in this PDF; all extracted text was placed in a single fallback section.",
        sourceId: "some-name",
        provenance: "unresolved",
      },
    ]);
  });

  it.each([
    ["C:\\imports\\dry-well.pdf", "dry-well"],
    [" /tmp/.PDF ", "Imported Adventure"],
  ])(
    "derives a safe fallback title from %s even with no lines",
    (fileName, title) => {
      const result = buildRawSectionsFromLines([], fileName);
      expect(result.rawSections).toEqual([
        {
          level: 1,
          title,
          lines: [],
          lineNumber: 1,
          pageNumber: 1,
          forceUnresolvedProvenance: true,
        },
      ]);
      expect(result.ambiguities[0]?.code).toBe("MISSING_HEADING");
    },
  );

  it("keeps source markers and oversized cues within their section", () => {
    const result = buildRawSectionsFromLines(
      [
        visualLine("# Gate", { y: 720 }),
        visualLine("<!-- source-id: gate -->", { y: 700, fontSize: 20 }),
        visualLine("Read aloud: The gate opens.", { y: 660, fontSize: 20 }),
        visualLine("The hinges creak in the wind.", { y: 620 }),
      ],
      "gate.pdf",
    );
    expect(result.rawSections).toHaveLength(1);
    expect(result.rawSections[0]?.lines).toEqual([
      "<!-- source-id: gate -->",
      "> **Read aloud:** The gate opens.",
      "",
      "The hinges creak in the wind.",
    ]);
  });
});
