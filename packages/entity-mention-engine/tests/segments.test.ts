import { describe, expect, it } from "bun:test";
import { segmentText } from "../src/segments";
import type { Mention } from "../src/types";

const elara: Mention = {
  entityId: "e1",
  displayName: "Elara Voss",
  entityType: "character",
  start: 7,
  end: 18,
};

describe("segmentText", () => {
  it("returns one text segment when there are no mentions", () => {
    expect(segmentText("hello there", [])).toEqual([
      { kind: "text", text: "hello there" },
    ]);
  });

  it("splits text around a mention in order", () => {
    expect(segmentText("who is @Elara Voss?", [elara])).toEqual([
      { kind: "text", text: "who is " },
      {
        kind: "mention",
        entityId: "e1",
        displayName: "Elara Voss",
        start: 7,
        end: 18,
      },
      { kind: "text", text: "?" },
    ]);
  });

  it("treats a mention whose text no longer matches as plain text", () => {
    const segments = segmentText("who is @Elora?", [elara]);
    expect(segments.every((s) => s.kind === "text")).toBe(true);
    expect(
      segments.map((s) => (s.kind === "text" ? s.text : "")).join(""),
    ).toBe("who is @Elora?");
  });

  it("handles two mentions", () => {
    const text = "who is @Elara Voss and @Royal";
    const second: Mention = {
      entityId: "e2",
      displayName: "Royal",
      entityType: "location",
      start: 23,
      end: 29,
    };
    const kinds = segmentText(text, [elara, second]).map((s) => s.kind);
    expect(kinds).toEqual(["text", "mention", "text", "mention"]);
  });
});
