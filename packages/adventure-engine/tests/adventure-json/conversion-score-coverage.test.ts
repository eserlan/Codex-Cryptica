import { describe, expect, it } from "vitest";
import {
  scoreCoverage,
  scoreCitations,
  scoreTruncation,
} from "../../src/adventure-json/conversion-score-coverage";
import { allEntities } from "../../src/adventure-json/conversion-score-document";
import { makeDocument, makeKey } from "./conversion-score-fixtures";

const key = () =>
  makeKey({
    sections: [
      { sourceId: "header", title: "Header", container: true },
      { sourceId: "mill", title: "The Mill" },
      { sourceId: "end", title: "Ending" },
    ],
    npcs: [{ name: "Maren", motivation: "Save the mill", sourceId: "mill" }],
    endings: [
      { id: "escape", description: "Escape the flood", sourceId: "end" },
    ],
    missableClue: {
      clue: "A silver key unlocks the cellar",
      primarySourceId: "mill",
      alternativeSourceId: "end",
    },
  });
const document = () =>
  makeDocument({
    actors: [{ id: "maren", name: "MAREN" }],
    scenes: [{ id: "room", sourceRef: { section: " THE MILL " } }],
    endings: [{ id: "renamed", sourceRef: { anchor: "end" } }],
    clues: [{ id: "key", text: "A silver key unlocks the cellar" }],
  });

describe("conversion coverage scoring", () => {
  it("accepts normalised names and citations and ignores container sections", () => {
    const doc = document();
    expect(scoreCoverage(doc, allEntities(doc), key())).toEqual({
      status: "pass",
      details: [],
    });
  });

  it("reports missing sections, NPCs, endings and clues in order", () => {
    const doc = makeDocument();
    expect(scoreCoverage(doc, allEntities(doc), key())).toEqual({
      status: "fail",
      details: [
        "missing section mill",
        "missing section end",
        "missing npc Maren",
        "missing ending escape",
        "missing clue A silver key unlocks the cellar",
      ],
    });
  });

  it("accepts section IDs and ending IDs, and falls back to anchors for unlisted ending sources", () => {
    const doc = document();
    doc.scenes = [{ id: "mill" }];
    doc.endings = [{ id: "escape", sourceRef: { section: "Ending" } }];
    expect(scoreCoverage(doc, allEntities(doc), key()).status).toBe("pass");
    const unlisted = key();
    unlisted.endings[0]!.sourceId = "outside";
    doc.endings = [{ id: "renamed", sourceRef: { anchor: "outside" } }];
    expect(
      scoreCoverage(doc, allEntities(doc), unlisted).details,
    ).not.toContain("missing ending escape");
  });

  it("requires clues from every keyed conclusion", () => {
    const doc = document();
    const withConclusion = makeKey({
      ...key(),
      conclusions: [
        {
          id: "flood",
          statement: "Someone damaged the wheel",
          clues: [
            { text: "Fresh saw marks cover the wheel", sourceId: "mill" },
          ],
        },
      ],
    });
    expect(
      scoreCoverage(doc, allEntities(doc), withConclusion).details,
    ).toEqual(["missing clue Fresh saw marks cover the wheel"]);
    doc.clues.push({ id: "saw", text: "Fresh saw marks cover the wheel" });
    expect(scoreCoverage(doc, allEntities(doc), withConclusion).status).toBe(
      "pass",
    );
  });
});

describe("conversion citation and truncation scoring", () => {
  it("accepts known anchors and reports absent or repeated unknown anchors", () => {
    expect(scoreCitations(allEntities(document()), key())).toEqual({
      status: "pass",
      details: [],
    });
    expect(scoreCitations([], key()).details).toEqual([
      "no sourceRef.anchor found in document",
    ]);
    expect(
      scoreCitations(
        [
          { id: "one", sourceRef: { anchor: "unknown" } },
          { id: "two", sourceRef: { anchor: "unknown" } },
        ],
        key(),
      ).details,
    ).toEqual(["unknown anchor unknown", "unknown anchor unknown"]);
  });

  it("reports only the contiguous uncited tail, in source order", () => {
    const withTail = key();
    withTail.sections.push({ sourceId: "epilogue", title: "Epilogue" });
    expect(scoreTruncation([{ id: "mill" }], withTail).details).toEqual([
      "uncited trailing section end",
      "uncited trailing section epilogue",
    ]);
    expect(scoreTruncation([{ id: "epilogue" }], withTail).status).toBe("pass");
    expect(scoreTruncation([], withTail).details).toEqual([
      "uncited trailing section mill",
      "uncited trailing section end",
      "uncited trailing section epilogue",
    ]);
  });
});
