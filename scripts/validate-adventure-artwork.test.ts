import { describe, expect, it } from "vitest";
import {
  validateCatalogueTransition,
  validateReleaseCatalogue,
  verifyArtworkVariants,
  verifyReleaseAssets,
} from "./validate-adventure-artwork.mjs";
import { createHash } from "node:crypto";

const digest = "a".repeat(64);
const variant = {
  url: "https://assets.codexcryptica.com/adventure-artwork/forest.webp",
  mime: "image/webp",
  width: 300,
  height: 200,
  bytes: 100,
  sha256: digest,
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
describe("uploaded artwork validation", () => {
  const bytes = new TextEncoder().encode("RIFFxxxxWEBPpayload");
  const uploaded = {
    ...variant,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  const item = { ...asset, variants: { preview: uploaded, display: uploaded } };
  it("checks fetched bytes and decoded dimensions for each variant", async () => {
    const fetcher = async () =>
      new Response(bytes, { headers: { "content-type": "image/webp" } });
    await expect(
      verifyArtworkVariants([item], {
        fetch: fetcher,
        decode: async () => ({ width: 300, height: 200 }),
      }),
    ).resolves.toBeUndefined();
  });
  it("rejects corrupt bytes, wrong decoded dimensions and redirects", async () => {
    const response = () =>
      new Response(bytes, { headers: { "content-type": "image/webp" } });
    await expect(
      verifyArtworkVariants(
        [
          {
            ...item,
            variants: {
              ...item.variants,
              display: { ...uploaded, sha256: "b".repeat(64) },
            },
          },
        ],
        {
          fetch: async () => response(),
          decode: async () => ({ width: 300, height: 200 }),
        },
      ),
    ).rejects.toThrow();
    await expect(
      verifyArtworkVariants([item], {
        fetch: async () => response(),
        decode: async () => ({ width: 1, height: 1 }),
      }),
    ).rejects.toThrow();
    await expect(
      verifyArtworkVariants([item], {
        fetch: async () =>
          new Response(null, {
            status: 302,
            headers: { location: "https://evil.test" },
          }),
        decode: async () => ({ width: 300, height: 200 }),
      }),
    ).rejects.toThrow();
  });
  it("closes the browser decoder after success and after a failed verification", async () => {
    let closed = 0;
    const openDecoder = async () => ({
      decode: async () => ({ width: 300, height: 200 }),
      close: async () => {
        closed++;
      },
    });
    const fetcher = async () =>
      new Response(bytes, { headers: { "content-type": "image/webp" } });
    await verifyReleaseAssets([item], { fetch: fetcher, openDecoder });
    expect(closed).toBe(1);
    await expect(
      verifyReleaseAssets([item], {
        fetch: async () => new Response("bad"),
        openDecoder,
      }),
    ).rejects.toThrow();
    expect(closed).toBe(2);
  });
});
describe("catalogue transition", () => {
  it("allows metadata changes without changing variants", () =>
    expect(
      validateCatalogueTransition(
        [{ ...asset, alt: "Woodland", version: 2 }],
        [asset],
      ),
    ).toHaveLength(1));
  it("rejects replacing artwork under an existing ID", () =>
    expect(() =>
      validateCatalogueTransition(
        [
          {
            ...asset,
            variants: {
              ...asset.variants,
              display: { ...variant, sha256: "b".repeat(64) },
            },
          },
        ],
        [asset],
      ),
    ).toThrow("immutable"));
  it("rejects invalid or missing provenance", () =>
    expect(() =>
      validateCatalogueTransition(
        [{ ...asset, provenance: { ...asset.provenance, model: "" } }],
        [],
      ),
    ).toThrow());
  it("requires previously released IDs to remain as withdrawn records", () => {
    expect(() => validateCatalogueTransition([], [asset])).toThrow(
      "historical",
    );
    expect(
      validateCatalogueTransition([{ ...asset, withdrawn: true }], [asset]),
    ).toHaveLength(1);
  });
  it("rejects an incomplete release and accepts a reviewed 24-image seed with required coverage", () => {
    expect(() => validateReleaseCatalogue([], [])).toThrow("24");
    const genres = [
      "fantasy",
      "contemporary",
      "science-fiction",
      "horror",
      "neutral",
    ];
    const assets = Array.from({ length: 24 }, (_, index) => ({
      ...asset,
      id: `art-${index}`,
      genres: [genres[index % genres.length]],
      variants: {
        ...asset.variants,
        display: {
          ...variant,
          url: `https://assets.codexcryptica.com/adventure-artwork/art-${index}.webp`,
          sha256: index.toString(16).padStart(64, "0"),
        },
      },
    }));
    expect(validateReleaseCatalogue(assets, [])).toHaveLength(24);
    expect(() =>
      validateReleaseCatalogue(
        assets.map((item) => ({ ...item, genres: ["fantasy"] })),
        [],
      ),
    ).toThrow("coverage");
  });
});
