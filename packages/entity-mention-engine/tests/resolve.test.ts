import { describe, expect, it } from "bun:test";
import { collectPinnedIds, resolve } from "../src/resolve";
import type { Mention } from "../src/types";
import {
  academy,
  elara,
  elenaOne,
  elenaTwo,
  hiddenSpy,
  makeSource,
} from "./fixtures";

const mention = (
  entityId: string,
  displayName: string,
  start: number,
): Mention => ({
  entityId,
  displayName,
  entityType: "character",
  start,
  end: start + displayName.length + 1,
});

describe("resolve: tracked mentions", () => {
  it("resolves a tracked mention by its entity id, not its text", () => {
    const text = "who is @Elara Voss?";
    const source = makeSource([elara]);
    const [result] = resolve(
      text,
      [mention("e-elara", "Elara Voss", 7)],
      source,
    );
    expect(result).toMatchObject({ status: "resolved", entityId: "e-elara" });
  });

  it("still resolves after the entity is renamed, using the live title", () => {
    const text = "who is @Elara Voss?";
    const renamed = { ...elara, title: "Elara Vossberg" };
    const source = makeSource([renamed]);
    const [result] = resolve(
      text,
      [mention("e-elara", "Elara Voss", 7)],
      source,
    );
    expect(result).toMatchObject({
      status: "resolved",
      entityId: "e-elara",
      displayName: "Elara Vossberg",
    });
  });

  it("returns unavailable for a tracked mention whose entity was deleted", () => {
    const text = "who is @Elara Voss?";
    const source = makeSource([academy]);
    const [result] = resolve(
      text,
      [mention("e-elara", "Elara Voss", 7)],
      source,
    );
    expect(result).toMatchObject({
      status: "unavailable",
      displayName: "Elara Voss",
    });
    expect(result.entityId).toBeUndefined();
  });

  it("returns unavailable for a tracked mention that is hidden from the user", () => {
    const text = "@Shadow Spy";
    const source = makeSource([hiddenSpy]);
    const [result] = resolve(text, [mention("e-spy", "Shadow Spy", 0)], source);
    expect(result.status).toBe("unavailable");
  });

  it("resolves several tracked mentions in order", () => {
    const text = "How is @Elara Voss connected to @Royal Academy of Pagen?";
    const source = makeSource([elara, academy]);
    const results = resolve(
      text,
      [
        mention("e-elara", "Elara Voss", 7),
        mention("e-academy", "Royal Academy of Pagen", 32),
      ],
      source,
    );
    expect(results.map((r) => r.entityId)).toEqual(["e-elara", "e-academy"]);
  });
});

describe("resolve: untracked @name", () => {
  it("resolves a unique alias match", () => {
    const [result] = resolve("ask @archmage", [], makeSource([elara]));
    expect(result).toMatchObject({
      status: "resolved",
      entityId: "e-elara",
      start: 4,
    });
  });

  it("prefers the longest name, so @Elara Voss wins over @Elara", () => {
    const text = "@Elara Voss";
    const [result] = resolve(
      text,
      [],
      makeSource([elara, { id: "e-short", title: "Elara" }]),
    );
    expect(result).toMatchObject({
      status: "resolved",
      entityId: "e-elara",
      end: 11,
    });
  });

  it("is case-insensitive", () => {
    const [result] = resolve("@ELARA VOSS", [], makeSource([elara]));
    expect(result.status).toBe("resolved");
  });

  it("returns ambiguous with candidates when several entities share the name", () => {
    const [result] = resolve(
      "who is @elena?",
      [],
      makeSource([elenaOne, elenaTwo]),
    );
    expect(result.status).toBe("ambiguous");
    expect(result.candidates).toEqual(["e-elena-1", "e-elena-2"]);
  });

  it("returns unmatched when no entity has that name", () => {
    const [result] = resolve("who is @zzz?", [], makeSource([elara]));
    expect(result).toMatchObject({ status: "unmatched", displayName: "zzz" });
  });

  it("never matches a hidden entity", () => {
    const [result] = resolve("@shadow", [], makeSource([hiddenSpy]));
    expect(result.status).toBe("unmatched");
  });

  it("ignores @ inside an email address", () => {
    expect(resolve("mail elara@voss.com", [], makeSource([elara]))).toEqual([]);
  });

  it("does not re-resolve text already covered by a tracked mention", () => {
    const text = "@Elara Voss";
    const results = resolve(
      text,
      [mention("e-elara", "Elara Voss", 0)],
      makeSource([elara]),
    );
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("resolved");
  });
});

describe("collectPinnedIds", () => {
  it("collapses duplicate entities and keeps the first-seen order", () => {
    const results = resolve(
      "@Elara Voss and @Royal Academy of Pagen and @Elara Voss again",
      [],
      makeSource([elara, academy]),
    );
    expect(collectPinnedIds(results)).toEqual(["e-elara", "e-academy"]);
  });

  it("skips unavailable, ambiguous and unmatched results", () => {
    const results = resolve(
      "@zzz @elena",
      [],
      makeSource([elenaOne, elenaTwo]),
    );
    expect(collectPinnedIds(results)).toEqual([]);
  });
});
