import { describe, expect, it } from "vitest";
import rawKey from "../../../../fixtures/adventures/reference-one-shot/answer-key.json";
import {
  ACTIONABLE_DETAIL_CATEGORIES,
  ActionableDetailSchema,
  ConversionAnswerKeyFieldsSchema,
  ConversionAnswerKeySchema,
} from "../../src/adventure-json/conversion-answer-key";
import { ConversionAnswerKeySchema as publicSchema } from "../../src/adventure-json/conversion-score";
import { ReferenceOneShotKeySchema } from "../reference-one-shot-key";

describe("conversion answer-key schemas", () => {
  it("preserves the public schema and parses the reference key", () => {
    expect(publicSchema).toBe(ConversionAnswerKeySchema);
    expect(ConversionAnswerKeySchema.parse(rawKey)).toEqual(rawKey);
    expect(ConversionAnswerKeyFieldsSchema.parse(rawKey)).toEqual(rawKey);
  });

  it.each(ACTIONABLE_DETAIL_CATEGORIES)(
    "accepts the %s detail category",
    (category) => {
      const detail = { sourceId: "room", category, detail: "A hidden stair." };
      expect(ActionableDetailSchema.parse(detail)).toEqual(detail);
    },
  );

  it("rejects unknown fields and detail sources", () => {
    expect(
      ConversionAnswerKeySchema.safeParse({ ...rawKey, extra: true }).success,
    ).toBe(false);
    expect(
      ConversionAnswerKeySchema.safeParse({
        ...rawKey,
        actionableDetails: [
          { sourceId: "unknown", category: "clue", detail: "A hidden stair." },
        ],
      }).success,
    ).toBe(false);
    expect(
      ActionableDetailSchema.safeParse({
        sourceId: "room",
        category: "flavour",
        detail: "A hidden stair.",
      }).success,
    ).toBe(false);
  });

  it.each(["sections", "secrets", "endings"] as const)(
    "rejects duplicated %s identifiers",
    (collection) => {
      const key = {
        ...rawKey,
        [collection]: [...rawKey[collection], rawKey[collection][0]],
      };
      expect(ConversionAnswerKeySchema.safeParse(key).success).toBe(false);
      expect(ReferenceOneShotKeySchema.safeParse(key).success).toBe(false);
    },
  );

  it("shares clue constraints while preserving the fixture validator's rules", () => {
    const key = {
      ...rawKey,
      missableClue: {
        ...rawKey.missableClue,
        alternativeSourceId: rawKey.missableClue.primarySourceId,
      },
    };
    expect(ConversionAnswerKeySchema.safeParse(key).success).toBe(false);
    expect(ReferenceOneShotKeySchema.safeParse(key).success).toBe(false);
    expect(
      ReferenceOneShotKeySchema.safeParse({
        ...rawKey,
        adventureFile: "another.md",
      }).success,
    ).toBe(false);
    const withUnlistedDetail = {
      ...rawKey,
      actionableDetails: [
        { sourceId: "unknown", category: "clue", detail: "A hidden stair." },
      ],
    };
    expect(
      ReferenceOneShotKeySchema.safeParse(withUnlistedDetail).success,
    ).toBe(true);
    expect(
      ReferenceOneShotKeySchema.safeParse({ ...rawKey, testimonies: [] })
        .success,
    ).toBe(false);
  });
});
