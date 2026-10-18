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

  it("requires a public snapshot to have a valid share ID slug and timestamp", () => {
    expect(
      GeneratorShareSchema.safeParse({
        ...valid,
        shareId: "npc-mara-venn-a1b2c3",
        createdAt: "2026-09-13T12:00:00Z",
      }).success,
    ).toBe(true);
    expect(
      GeneratorShareSchema.safeParse({
        ...valid,
        shareId: "not_valid_slug",
        createdAt: "2026-09-13T12:00:00Z",
      }).success,
    ).toBe(false);
    expect(
      GeneratorShareSchema.safeParse({
        ...valid,
        shareId: "npc-mara-venn-a1b2c3",
        createdAt: "yesterday",
      }).success,
    ).toBe(false);
  });
});
