import { describe, expect, it } from "vitest";
import {
  MAX_PLACE_ALIASES,
  placeMoveSchema,
  placeSchema,
} from "../src/place-schemas";

describe("place schemas", () => {
  it("allows moves by ID or name while rejecting empty or unknown destinations", () => {
    expect(placeMoveSchema.parse({ placeId: "mill" })).toEqual({
      placeId: "mill",
    });
    expect(placeMoveSchema.parse({ name: " The mill " })).toEqual({
      name: "The mill",
    });
    expect(() => placeMoveSchema.parse({})).toThrow(
      "A move needs a placeId or a name.",
    );
    expect(placeMoveSchema.safeParse({ name: " " }).success).toBe(false);
    expect(
      placeMoveSchema.safeParse({ name: "Mill", extra: true }).success,
    ).toBe(false);
  });

  it("bounds place aliases and cues", () => {
    const place = {
      id: "mill",
      name: "Mill",
      aliases: Array(MAX_PLACE_ALIASES).fill("Old mill"),
      cues: ["stone"],
    };
    expect(placeSchema.parse(place)).toEqual(place);
    expect(
      placeSchema.safeParse({
        ...place,
        aliases: [...place.aliases, "Another"],
      }).success,
    ).toBe(false);
    expect(
      placeSchema.safeParse({ ...place, cues: ["x".repeat(33)] }).success,
    ).toBe(false);
  });
});
