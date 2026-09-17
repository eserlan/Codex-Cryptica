import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getLiveGeneratorListings,
  renderLlmsGeneratorLines,
} from "./llms-generators";
import { GENERATOR_SLUGS } from "../../params/generator_slug";
import {
  LLMS_GENERATORS_END,
  LLMS_GENERATORS_START,
  extractMarkedSection,
} from "./llms-section-markers";

const llmsTxtPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../static/llms.txt",
);

describe("llms generator listings", () => {
  it("covers every live indexable generator exactly once", () => {
    const listings = getLiveGeneratorListings();
    expect(listings.length).toBeGreaterThan(0);
    const paths = listings.map((listing) => listing.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const listing of listings) {
      expect(listing.title.trim().length).toBeGreaterThan(0);
      expect(listing.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("includes the heist generator at its canonical path", () => {
    const heist = getLiveGeneratorListings().find(
      (listing) => listing.slug === "heist",
    );
    expect(heist?.path).toBe("/generators/heist");
    expect(heist?.title).toMatch(/heist/i);
  });

  it("includes bespoke pages without slugMeta via the registry fallback", () => {
    const random = getLiveGeneratorListings().find(
      (listing) => listing.slug === "random",
    );
    expect(random?.path).toBe("/generators/random");
    expect(random?.title.trim().length).toBeGreaterThan(0);
    expect(random?.description.trim().length).toBeGreaterThan(0);
  });

  it("lists only routes the generator router actually serves", () => {
    for (const listing of getLiveGeneratorListings()) {
      expect(
        (GENERATOR_SLUGS as readonly string[]).includes(listing.slug),
        `${listing.path} is not a live generator route`,
      ).toBe(true);
    }
  });

  it("keeps the checked-in llms.txt generator section in sync", () => {
    const llmsTxt = fs.readFileSync(llmsTxtPath, "utf8");
    const section = extractMarkedSection(
      llmsTxt,
      LLMS_GENERATORS_START,
      LLMS_GENERATORS_END,
    );
    expect(section).not.toBeNull();
    expect(section!.trim().split("\n")).toEqual(renderLlmsGeneratorLines());
  });
});
