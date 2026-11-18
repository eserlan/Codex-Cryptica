import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AdventureJsonV1Schema,
  entrySceneId,
  startSceneCandidates,
} from "../../src/adventure-json";

type S = {
  id: string;
  optional?: boolean;
  branches?: { targetSceneId: string }[];
};
const candidates = (scenes: S[]) =>
  startSceneCandidates({ scenes: scenes as never }).map((s) => s.id);

describe("entrySceneId", () => {
  it("returns the first scene id", () => {
    expect(entrySceneId({ scenes: [{ id: "a" }, { id: "b" }] as never })).toBe(
      "a",
    );
  });

  it("returns undefined when there are no scenes", () => {
    expect(entrySceneId({ scenes: [] })).toBeUndefined();
  });
});

describe("startSceneCandidates", () => {
  it("returns nothing without scenes", () => {
    expect(candidates([])).toEqual([]);
  });

  it("returns the only scene", () => {
    expect(candidates([{ id: "a" }])).toEqual(["a"]);
  });

  it("excludes an optional scene that another scene branches to", () => {
    expect(
      candidates([
        { id: "a", branches: [{ targetSceneId: "b" }] },
        { id: "b", optional: true },
      ]),
    ).toEqual(["a"]);
  });

  it("lists an optional scene with no inbound branch after the entry scene", () => {
    expect(
      candidates([{ id: "a" }, { id: "b" }, { id: "c", optional: true }]),
    ).toEqual(["a", "c"]);
  });

  it("excludes a non-optional scene with no inbound branch", () => {
    expect(candidates([{ id: "a" }, { id: "b" }])).toEqual(["a"]);
  });

  it("does not count a self-branch as inbound", () => {
    expect(
      candidates([
        { id: "a" },
        { id: "b", optional: true, branches: [{ targetSceneId: "b" }] },
      ]),
    ).toEqual(["a", "b"]);
  });

  it.each(["reference-one-shot", "mystery"])(
    "yields only the first scene for the %s fixture",
    (name) => {
      const pkg = AdventureJsonV1Schema.parse(
        JSON.parse(
          readFileSync(
            resolve(
              __dirname,
              `../../../../fixtures/adventures/${name}/adventure.v1.json`,
            ),
            "utf8",
          ),
        ),
      );
      expect(startSceneCandidates(pkg).map((s) => s.id)).toEqual([
        pkg.scenes[0].id,
      ]);
    },
  );
});
