import { describe, expect, it } from "vitest";
import { characterChoices } from "./solo-characters";

const entity = (id: string, type: string, title: string) => ({
  id,
  type,
  title,
});

describe("characterChoices", () => {
  it("lists only Character entities, as id and display name", () => {
    const entities = {
      a: entity("a", "character", "Mara One-Eye"),
      b: entity("b", "location", "Oakvale"),
      c: entity("c", "character", "Brann"),
    };
    expect(characterChoices(entities)).toEqual([
      { id: "a", name: "Mara One-Eye" },
      { id: "c", name: "Brann" },
    ]);
  });

  it("returns an empty list when there are no entities or no characters", () => {
    expect(characterChoices(undefined)).toEqual([]);
    expect(characterChoices({})).toEqual([]);
    expect(characterChoices({ b: entity("b", "item", "Lantern") })).toEqual([]);
  });
});
