import { describe, expect, it } from "vitest";
import { handleAssetGallery } from "./asset-gallery";

function bucket(
  keys: { key: string; size: number; uploaded?: Date | string }[],
) {
  return {
    async list({ cursor }: { cursor?: string }) {
      // Single page is enough for these tests; pagination itself isn't the
      // thing under test here.
      if (cursor) return { objects: [], truncated: false };
      return { objects: keys, truncated: false };
    },
  };
}

function extractGalleryData(html: string) {
  const match = html.match(
    /<script id="gallery-data" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) {
    throw new Error("Missing #gallery-data script in gallery HTML");
  }
  return JSON.parse(match[1].replace(/\\u003c/g, "<"));
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

  it("escapes R2-derived tile values at the client HTML sink", async () => {
    const env = {
      BUCKET: bucket([
        {
          key: 'screenshots/cover" onerror="alert(1).png',
          size: 1000,
        },
      ]),
    };
    const response = await handleAssetGallery(
      new Request("https://x/gallery"),
      env,
    );
    const html = await response.text();

    expect(html).toContain("function escapeHtml(value)");
    expect(html).toContain('href="${safeUrl}"');
    expect(html).toContain('alt="${safeName}"');
    expect(html).toContain('data-search="${safeSearch}"');
  });

  it("gives the asset filter an accessible name", async () => {
    const response = await handleAssetGallery(
      new Request("https://x/gallery"),
      { BUCKET: bucket([]) },
    );
    const html = await response.text();

    expect(html).toContain('aria-label="Filter assets by name or purpose"');
  });

  it("includes adventure-artwork and deduplicates preview/display pairs into one tile", async () => {
    const env = {
      BUCKET: bucket([
        {
          key: "adventure-artwork/loc-fantasy-forest-01-preview-7d41a3cb5bfa.webp",
          size: 12_000,
          uploaded: new Date("2026-11-10T10:00:00.000Z"),
        },
        {
          key: "adventure-artwork/loc-fantasy-forest-01-display-6cdd489d0aff.webp",
          size: 85_000,
          uploaded: new Date("2026-11-10T10:05:00.000Z"),
        },
        {
          key: "adventure-artwork/char-rogue-02-preview-aaaa1111bbbb.webp",
          size: 11_000,
          uploaded: new Date("2026-11-11T12:00:00.000Z"),
        },
        {
          key: "adventure-artwork/loc-tavern-03-display-cccc2222dddd.webp",
          size: 92_000,
          uploaded: new Date("2026-11-12T08:00:00.000Z"),
        },
      ]),
    };

    const response = await handleAssetGallery(
      new Request("https://x/gallery"),
      env,
    );
    const html = await response.text();
    const data = extractGalleryData(html);

    const group = data.groups.find(
      (g: { id: string }) => g.id === "adventure-artwork",
    );
    expect(group).toBeDefined();
    expect(group.title).toBe("Adventure Artwork");
    expect(group.items).toHaveLength(3);

    const forest = group.items.find(
      (it: { purpose: string }) => it.purpose === "Loc Fantasy Forest 01",
    );
    expect(forest).toEqual({
      key: "adventure-artwork/loc-fantasy-forest-01-display-6cdd489d0aff.webp",
      url: "https://assets.codexcryptica.com/adventure-artwork/loc-fantasy-forest-01-display-6cdd489d0aff.webp",
      thumbUrl:
        "https://assets.codexcryptica.com/adventure-artwork/loc-fantasy-forest-01-preview-7d41a3cb5bfa.webp",
      size: "83 KB",
      purpose: "Loc Fantasy Forest 01",
      uploaded: "2026-11-10T10:05:00.000Z",
    });

    const rogue = group.items.find(
      (it: { purpose: string }) => it.purpose === "Char Rogue 02",
    );
    expect(rogue?.url).toBe(
      "https://assets.codexcryptica.com/adventure-artwork/char-rogue-02-preview-aaaa1111bbbb.webp",
    );
    expect(rogue?.thumbUrl).toBeUndefined();

    const tavern = group.items.find(
      (it: { purpose: string }) => it.purpose === "Loc Tavern 03",
    );
    expect(tavern?.url).toBe(
      "https://assets.codexcryptica.com/adventure-artwork/loc-tavern-03-display-cccc2222dddd.webp",
    );
    expect(tavern?.thumbUrl).toBeUndefined();

    expect(html).toContain("item.thumbUrl || item.url");
    expect(html).toContain('src="${safeThumbUrl}"');
  });

  it("captures uploaded timestamps and renders the sort control", async () => {
    const env = {
      BUCKET: bucket([
        {
          key: "og/traveller.jpg",
          size: 900,
          uploaded: new Date("2026-11-01T00:00:00.000Z"),
        },
        {
          key: "og/fantasy.jpg",
          size: 1200,
          uploaded: "2026-11-05T15:30:00.000Z",
        },
        {
          key: "og/undated.jpg",
          size: 800,
        },
      ]),
    };

    const response = await handleAssetGallery(
      new Request("https://x/gallery"),
      env,
    );
    const html = await response.text();
    const data = extractGalleryData(html);

    const ogGroup = data.groups.find((g: { id: string }) => g.id === "og");
    expect(ogGroup.items).toEqual([
      expect.objectContaining({
        key: "og/fantasy.jpg",
        uploaded: "2026-11-05T15:30:00.000Z",
      }),
      expect.objectContaining({
        key: "og/traveller.jpg",
        uploaded: "2026-11-01T00:00:00.000Z",
      }),
      expect.objectContaining({
        key: "og/undated.jpg",
        uploaded: null,
      }),
    ]);

    expect(html).toContain('id="sortSelect"');
    expect(html).toContain('aria-label="Sort assets"');
    expect(html).toContain(
      '<option value="name-asc" selected>Name (A–Z)</option>',
    );
    expect(html).toContain('<option value="date-desc">Newest first</option>');
    expect(html).toContain('<option value="date-asc">Oldest first</option>');
  });

  it("renders a lightbox with arrow-key and escape navigation", async () => {
    const response = await handleAssetGallery(
      new Request("https://x/gallery"),
      { BUCKET: bucket([{ key: "og/one.jpg", size: 1024 }]) },
    );
    const html = await response.text();
    expect(html).toContain('id="lightbox"');
    expect(html).toContain('id="lbPrev"');
    expect(html).toContain('id="lbNext"');
    expect(html).toContain("ArrowLeft");
    expect(html).toContain("ArrowRight");
    expect(html).toContain("Escape");
    expect(html).toContain("if (!wasOpen) lbClose.focus()");
    expect(html).toContain('evt.key === "Tab"');
    expect(html).toContain("lightbox.contains(document.activeElement)");
    expect(html).toContain("width: 44px; height: 44px");
  });

  it("returns 500 when the bucket binding is missing", async () => {
    const response = await handleAssetGallery(
      new Request("https://x/gallery"),
      {},
    );
    expect(response.status).toBe(500);
  });
});
