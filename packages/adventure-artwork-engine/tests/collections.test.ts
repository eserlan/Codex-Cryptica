import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { collectionDigestInput, validateCollection } from "../src/collections";
import type { ArtworkAsset } from "../src/catalogue";

const hash = async (value: Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
const variant = (url: string, bytes: number) => ({
  url,
  bytes,
  sha256: "a".repeat(64),
  mime: "image/webp" as const,
  width: 100,
  height: 100,
});
const catalogue = [
  {
    id: "forest",
    withdrawn: false,
    review: { status: "approved" },
    variants: {
      preview: variant(
        "https://assets.codexcryptica.com/adventure-artwork/one.webp",
        10,
      ),
      display: variant(
        "https://assets.codexcryptica.com/adventure-artwork/two.webp",
        20,
      ),
    },
  },
] as unknown as ArtworkAsset[];
const entries = [
  { assetId: "forest", variant: "preview" as const },
  { assetId: "forest", variant: "display" as const },
];
const manifest = {
  id: "forests",
  version: 1,
  title: "Forests",
  coverage: "Woodland places",
  credits: ["Codex Cryptica"],
  entries,
  bytes: 30,
  digest: "",
};
const make = async () => ({
  ...manifest,
  digest: await hash(collectionDigestInput(manifest)),
});

describe("artwork collection contracts", () => {
  it("resolves approved variants and calculates actual missing bytes", async () => {
    const result = await validateCollection(
      await make(),
      catalogue,
      new Set([catalogue[0].variants.preview.url]),
      hash,
    );
    expect(result.totalBytes).toBe(30);
    expect(result.missingBytes).toBe(20);
    expect(result.missing).toHaveLength(1);
  });
  it("rejects unknown, duplicate, withdrawn and tampered entries", async () => {
    const good = await make();
    await expect(
      validateCollection(
        { ...good, entries: [...entries, entries[0]] },
        catalogue,
        new Set(),
        hash,
      ),
    ).rejects.toThrow();
    await expect(
      validateCollection(
        { ...good, entries: [{ assetId: "missing", variant: "display" }] },
        catalogue,
        new Set(),
        hash,
      ),
    ).rejects.toThrow();
    await expect(
      validateCollection({ ...good, bytes: 31 }, catalogue, new Set(), hash),
    ).rejects.toThrow();
    await expect(
      validateCollection(
        { ...good, digest: "0".repeat(64) },
        catalogue,
        new Set(),
        hash,
      ),
    ).rejects.toThrow();
    await expect(
      validateCollection(
        good,
        [{ ...catalogue[0], withdrawn: true }],
        new Set(),
        hash,
      ),
    ).rejects.toThrow();
  });
  it("counts shared variants once and rejects collections over 100 MiB", async () => {
    const shared = {
      ...catalogue[0],
      variants: {
        preview: catalogue[0].variants.preview,
        display: catalogue[0].variants.preview,
      },
    };
    const good = await make();
    const result = await validateCollection(
      { ...good, bytes: 10 },
      [shared],
      new Set(),
      hash,
    );
    expect(result.totalBytes).toBe(10);
    expect(result.variants).toHaveLength(1);
    const huge = {
      ...shared,
      variants: {
        preview: { ...shared.variants.preview, bytes: 101 * 1024 * 1024 },
        display: { ...shared.variants.display, bytes: 101 * 1024 * 1024 },
      },
    };
    await expect(
      validateCollection(
        { ...good, bytes: 101 * 1024 * 1024 },
        [huge],
        new Set(),
        hash,
      ),
    ).rejects.toThrow("size");
  });
});
