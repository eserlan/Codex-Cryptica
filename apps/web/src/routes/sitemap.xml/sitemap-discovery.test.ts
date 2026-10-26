import { describe, expect, it } from "vitest";
import { GET } from "./+server";
import { entries } from "#lib/content/discovery/entries/index.js";

const ORIGIN = "https://codexcryptica.com";

async function sitemapPaths(): Promise<Set<string>> {
  const xml = await (await GET()).text();
  return new Set(
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      (match) => match[1].replace(ORIGIN, "").replace(/\/$/, "") || "/",
    ),
  );
}

describe("sitemap and discovery registry", () => {
  it("lists every live, indexable discovery page", async () => {
    const listed = await sitemapPaths();
    const missing = entries
      .filter((entry) => entry.status === "live" && entry.indexable)
      .map((entry) => entry.canonicalPath)
      .filter((path) => !listed.has(path));

    expect(missing).toEqual([]);
  });

  it("leaves redirect stubs the registry marks as not indexable out", async () => {
    const listed = await sitemapPaths();

    expect(listed.has("/tools/dnd-npc-generator")).toBe(false);
    expect(
      entries.find(
        (entry) => entry.canonicalPath === "/tools/dnd-npc-generator",
      )?.indexable,
    ).toBe(false);
  });
});
