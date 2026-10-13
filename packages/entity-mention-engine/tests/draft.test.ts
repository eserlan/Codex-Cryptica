import { describe, expect, it } from "bun:test";
import { applySelection, reconcile, serialize } from "../src/draft";
import type { Mention } from "../src/types";

const elara: Mention = {
  entityId: "e1",
  displayName: "Elara Voss",
  entityType: "character",
  start: 7,
  end: 18,
};
// "who is @Elara Voss?" -> "@Elara Voss" occupies [7, 18)
const text = "who is @Elara Voss?";

describe("reconcile", () => {
  it("keeps a mention when text is typed after it", () => {
    const next = text + " now";
    expect(reconcile(text, next, [elara])).toEqual([elara]);
  });

  it("shifts a mention when text is inserted before it", () => {
    const next = "hey " + text;
    expect(reconcile(text, next, [elara])).toEqual([
      { ...elara, start: 11, end: 22 },
    ]);
  });

  it("shifts a mention when text before it is deleted", () => {
    const next = "is @Elara Voss?";
    expect(reconcile(text, next, [elara])).toEqual([
      { ...elara, start: 3, end: 14 },
    ]);
  });

  it("drops a mention when any character inside it is edited", () => {
    const next = "who is @Elora Voss?";
    expect(reconcile(text, next, [elara])).toEqual([]);
  });

  it("drops a mention when its text is deleted", () => {
    const next = "who is ?";
    expect(reconcile(text, next, [elara])).toEqual([]);
  });
});

describe("serialize", () => {
  it("keeps mentions that still match their text", () => {
    expect(serialize([elara], text)).toEqual([elara]);
  });

  it("drops mentions whose range no longer matches the text", () => {
    expect(serialize([elara], "who is ?")).toEqual([]);
  });

  it("drops mentions that run past the end of the text", () => {
    expect(serialize([{ ...elara, end: 99 }], text)).toEqual([]);
  });

  it("drops overlapping mentions, keeping the earlier one", () => {
    const overlap: Mention = { ...elara, entityId: "e2", start: 10, end: 19 };
    expect(serialize([overlap, elara], text)).toEqual([elara]);
  });
});

describe("applySelection", () => {
  const entity = { id: "e1", title: "Elara Voss", type: "character" };

  it("replaces the @query with the full name and records the mention", () => {
    const result = applySelection(
      "who is @ela",
      { query: "ela", start: 7, end: 11 },
      entity,
      [],
    );
    expect(result.text).toBe("who is @Elara Voss ");
    expect(result.mentions).toEqual([
      {
        entityId: "e1",
        displayName: "Elara Voss",
        entityType: "character",
        start: 7,
        end: 18,
      },
    ]);
    expect(result.caret).toBe(19);
  });

  it("shifts mentions that come after the replaced query", () => {
    const later: Mention = {
      entityId: "e2",
      displayName: "Royal Academy",
      entityType: "location",
      start: 9,
      end: 23,
    };
    const result = applySelection(
      "@ela and @Royal Academy",
      { query: "ela", start: 0, end: 4 },
      entity,
      [later],
    );
    const shifted = result.mentions.find((m) => m.entityId === "e2");
    // "@ela" (4 chars) became "@Elara Voss " (12 chars): +8
    expect(shifted?.start).toBe(17);
    expect(shifted?.end).toBe(31);
    expect(result.text.slice(17, 31)).toBe("@Royal Academy");
  });

  it("leaves the text unchanged when the trigger is stale", () => {
    const result = applySelection(
      "who is @elx",
      { query: "ela", start: 7, end: 11 },
      entity,
      [],
    );
    expect(result.text).toBe("who is @elx");
    expect(result.mentions).toEqual([]);
  });
});
