import { describe, expect, it } from "vitest";
import {
  GeneratorShareCreateSchema,
  GeneratorShareSchema,
  GENERATOR_SHARE_LIMITS,
} from "./generator-share";

const valid = {
  generatorId: "npc",
  title: "Mara Venn",
  content: "# Mara Venn\n\nA watchful guide.",
  metadata: { generatorPath: "/generators/npc", description: "A guide." },
};

describe("generator share schemas", () => {
  it("accepts the text-only create contract", () => {
    expect(GeneratorShareCreateSchema.parse(valid)).toEqual(valid);
  });

  it("rejects arbitrary routes and binary-looking payload fields", () => {
    expect(
      GeneratorShareCreateSchema.safeParse({
        ...valid,
        metadata: { ...valid.metadata, generatorPath: "/app" },
      }).success,
    ).toBe(false);
    expect(
      GeneratorShareCreateSchema.safeParse({
        ...valid,
        image: "data:image/png;base64,abc",
      }).success,
    ).toBe(false);
  });

  it("bounds content and labels", () => {
    expect(
      GeneratorShareCreateSchema.safeParse({
        ...valid,
        content: "x".repeat(GENERATOR_SHARE_LIMITS.maxContentLength + 1),
      }).success,
    ).toBe(false);
    expect(
      GeneratorShareCreateSchema.safeParse({
        ...valid,
        metadata: {
          ...valid.metadata,
          labels: [
            "one",
            "two",
            "three",
            "four",
            "five",
            "six",
            "seven",
            "eight",
            "nine",
          ],
        },
      }).success,
    ).toBe(false);
  });

  it("requires a public snapshot to have a UUID and timestamp", () => {
    expect(
      GeneratorShareSchema.safeParse({
        ...valid,
        shareId: "not-a-uuid",
        createdAt: "yesterday",
      }).success,
    ).toBe(false);
  });
});
