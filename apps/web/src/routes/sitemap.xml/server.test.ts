import { describe, expect, it } from "vitest";
import { GET } from "./+server";

describe("/sitemap.xml", () => {
  it("serves XML that lists static, generated and blog pages once each", async () => {
    const response = await GET();
    expect(response.headers.get("Content-Type")).toBe("application/xml");

    const xml = await response.text();
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

    expect(locs).toContain("https://codexcryptica.com/");
    expect(locs).toContain("https://codexcryptica.com/generators");
    expect(locs.some((loc) => loc.includes("/blog/"))).toBe(true);
    expect(new Set(locs).size).toBe(locs.length);
  });

  it("never lists private in-app routes", async () => {
    const xml = await (await GET()).text();
    expect(xml).not.toMatch(/<loc>[^<]*\/(oracle|canvas|map|vault)(\/|<)/);
  });
});
