import { describe, expect, it } from "vitest";
import { handleAssetGallery } from "./asset-gallery";

function bucket(keys: { key: string; size: number }[]) {
  return {
    async list({ cursor }: { cursor?: string }) {
      // Single page is enough for these tests; pagination itself isn't the
      // thing under test here.
      if (cursor) return { objects: [], truncated: false };
      return { objects: keys, truncated: false };
    },
  };
}

describe("handleAssetGallery", () => {
  it("never surfaces private or vault-shaped prefixes, even ones not explicitly named", async () => {
    const env = {
      BUCKET: bucket([
        { key: "screenshots/generator-npc.jpg", size: 1000 },
        // Private per-user backup bundles — must never appear.
        { key: "cloud-backup/abc123/bundle.png", size: 5000 },
        // Real guest-published vault content — not ours to gallery.
        { key: "published/some-vault-id/map.png", size: 2000 },
        // Our own demo vault art — still vault-shaped, excluded on purpose.
        { key: "vault-samples/images/fantasy-npc2.png", size: 1500 },
        // JSON metadata, not an image.
        { key: "directory/listings/foo.json", size: 100 },
        // A prefix that doesn't exist yet in any exclude list — the
        // allowlist must still keep it out by default.
        { key: "some-future-private-feature/secret.png", size: 100 },
      ]),
    };

    const response = await handleAssetGallery(
      new Request("https://x/gallery"),
      env,
    );
    const html = await response.text();

    expect(html).toContain("screenshots/generator-npc.jpg");
    expect(html).not.toContain("cloud-backup");
    expect(html).not.toContain("published/some-vault-id");
    expect(html).not.toContain("vault-samples");
    expect(html).not.toContain("directory/listings");
    expect(html).not.toContain("some-future-private-feature");
  });

  it("includes the silhouette catalog alongside the live bucket listing", async () => {
    const env = { BUCKET: bucket([{ key: "og/traveller.jpg", size: 900 }]) };
    const response = await handleAssetGallery(
      new Request("https://x/gallery"),
      env,
    );
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Silhouettes");
    expect(html).toContain("fantasy-warrior-male");
  });

  it("skips non-image objects within an allowed prefix", async () => {
    const env = {
      BUCKET: bucket([
        { key: "screenshots/generator-npc.jpg", size: 1000 },
        { key: "screenshots/readme.txt", size: 50 },
      ]),
    };
    const response = await handleAssetGallery(
      new Request("https://x/gallery"),
      env,
    );
    const html = await response.text();

    expect(html).toContain("generator-npc.jpg");
    expect(html).not.toContain("readme.txt");
  });

  it("returns 500 when the bucket binding is missing", async () => {
    const response = await handleAssetGallery(
      new Request("https://x/gallery"),
      {},
    );
    expect(response.status).toBe(500);
  });
});
