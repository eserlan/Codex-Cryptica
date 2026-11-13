import { describe, expect, it } from "vitest";
import { parseCatalogue } from "../src/catalogue";

const variant = {
  url: "https://assets.codexcryptica.com/adventure-artwork/forest.webp",
  mime: "image/webp",
  width: 300,
  height: 200,
  bytes: 100,
  sha256: "a".repeat(64),
};
const asset = {
  id: "forest",
  version: 1,
  type: "location",
  genres: ["fantasy"],
  primaryCues: ["forest"],
  settingCues: [],
  moodCues: [],
  timeCues: [],
  excludes: [],
  alt: "A forest",
  variants: { preview: variant, display: variant },
  origin: "team-generated-ai",
  provenance: {
    tool: "generator",
    model: "model",
    generatedAt: "2026-11-12",
    prompt: "forest",
    creator: "team",
    distributionBasis: "team-created",
    referencePermissions: "none",
    attribution: "Codex Cryptica",
  },
  review: {
    status: "approved",
    reviewer: "reviewer",
    date: "2026-11-12",
    notes: "reviewed",
  },
};

describe("artwork catalogue", () => {
  it("accepts asset IDs up to 100 characters and rejects longer IDs", () => {
    expect(parseCatalogue([{ ...asset, id: "a".repeat(100) }])).toHaveLength(1);
    expect(() => parseCatalogue([{ ...asset, id: "a".repeat(101) }])).toThrow();
  });
  it("accepts an approved generated asset", () =>
    expect(parseCatalogue([asset])).toHaveLength(1));
  it("rejects duplicates and assets without approved provenance", () => {
    expect(() => parseCatalogue([asset, asset])).toThrow();
    expect(() => parseCatalogue([{ ...asset, origin: "licensed" }])).toThrow();
    expect(() =>
      parseCatalogue([
        { ...asset, review: { ...asset.review, status: "pending" } },
      ]),
    ).toThrow();
  });
  it("rejects unsafe URLs, invalid dimensions and unknown genres", () => {
    for (const url of [
      "https://assets.codexcryptica.com/adventure-artwork/a.webp?private=x",
      "https://evil.example/adventure-artwork/a.webp",
      "https://assets.codexcryptica.com/adventure-artwork/%2e%2e/a.webp",
    ]) {
      expect(() =>
        parseCatalogue([
          {
            ...asset,
            variants: { ...asset.variants, display: { ...variant, url } },
          },
        ]),
      ).toThrow();
    }
    expect(() =>
      parseCatalogue([
        {
          ...asset,
          variants: { ...asset.variants, display: { ...variant, width: 4000 } },
        },
      ]),
    ).toThrow();
    expect(() => parseCatalogue([{ ...asset, genres: ["unknown"] }])).toThrow();
  });
});

it("rejects syntactically valid cues that are not in the controlled vocabulary", () => {
  expect(() =>
    parseCatalogue([{ ...asset, primaryCues: ["unknown-secret-trait"] }]),
  ).toThrow();
});
