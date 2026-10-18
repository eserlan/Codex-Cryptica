import { describe, expect, it } from "bun:test";
import { linkTitles } from "../src/link";
import { elara, academy } from "./fixtures";

describe("linkTitles", () => {
  it("links an exact title that appears in the text", () => {
    const mentions = linkTitles("Elara Voss leads the school.", [elara]);
    expect(mentions).toEqual([
      {
        entityId: "e-elara",
        displayName: "Elara Voss",
        entityType: "character",
        start: 0,
        end: 10,
      },
    ]);
  });

  it("prefers the longer title when two titles overlap", () => {
    const short = { id: "e-short", title: "Elara", type: "character" };
    const mentions = linkTitles("Elara Voss arrived.", [short, elara]);
    expect(mentions.map((m) => m.entityId)).toEqual(["e-elara"]);
  });

  it("ignores a title inside a longer word", () => {
    expect(linkTitles("Elarasmith forged it.", [elara])).toEqual([]);
  });

  it("matches case exactly, so a lowercase phrase stays plain", () => {
    expect(linkTitles("elara voss sent a note.", [elara])).toEqual([]);
  });

  it("returns nothing when there are no candidates or the title is empty", () => {
    expect(linkTitles("Elara Voss", [])).toEqual([]);
    expect(
      linkTitles("Elara Voss", [{ id: "e-blank", title: "  ", type: "x" }]),
    ).toEqual([]);
  });

  it("links every occurrence of a title, in order", () => {
    const text = "Royal Academy of Pagen, then Royal Academy of Pagen again.";
    const starts = linkTitles(text, [academy]).map((m) => m.start);
    expect(starts).toEqual([0, 29]);
  });
});
