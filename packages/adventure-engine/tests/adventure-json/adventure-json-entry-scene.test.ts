import { describe, expect, it } from "vitest";
import { entrySceneId } from "../../src/adventure-json";

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
