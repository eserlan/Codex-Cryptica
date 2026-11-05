import { describe, expect, it } from "vitest";
import {
  hasText,
  missing,
  uniqueIds,
  hasUniqueIds,
  hasCrossGroupIdCollision,
  knownIds,
  missingFields,
} from "./mystery-stage-validation";

describe("stage validation helpers", () => {
  it("reads nonblank strings and reports missing fields in order", () => {
    expect(hasText(" present ")).toBe(true);
    expect(hasText(1)).toBe(false);
    expect(
      missing({ first: " ", second: "ok" }, ["first", "second", "third"]),
    ).toEqual(['"first" is missing', '"third" is missing']);
    expect(
      missingFields(
        [{ name: "Ada", role: " " }, {}],
        ["name", "role"],
        "suspect",
      ),
    ).toEqual([
      "suspect 1 has no role",
      "suspect 2 has no name",
      "suspect 2 has no role",
    ]);
  });
  it("detects missing, duplicate and cross-group IDs without treating empty IDs as collisions", () => {
    expect(uniqueIds([{ id: " a " }, null])).toEqual(["a", ""]);
    expect(hasUniqueIds(["a", "b"])).toBe(true);
    expect(hasUniqueIds(["a", "a"])).toBe(false);
    expect(hasUniqueIds([""])).toBe(false);
    expect(hasCrossGroupIdCollision(["a", ""], ["b", ""])).toBe(false);
    expect(hasCrossGroupIdCollision(["a"], ["a"])).toBe(true);
  });
  it("collects references from every locked group and optional clues", () => {
    expect(
      knownIds(
        { revelations: [{ id: "rev-1" }] },
        { suspects: [{ id: "person-1" }], locations: [{ id: "place-1" }] },
        ["clue-1"],
      ),
    ).toEqual(["rev-1", "person-1", "place-1", "clue-1"]);
    expect(knownIds({}, {})).toEqual([]);
  });
});
