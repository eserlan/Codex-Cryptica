import { describe, expect, it } from "vitest";
import {
  DEFAULT_GENERATOR_KEYS,
  GENERATOR_CATALOGUE,
  getCatalogueEntry,
} from "./generator-catalogue";

describe("generator catalogue", () => {
  it("has unique keys", () => {
    const keys = GENERATOR_CATALOGUE.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every entry a slug, label and description", () => {
    for (const entry of GENERATOR_CATALOGUE) {
      expect(entry.slug.length).toBeGreaterThan(0);
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it("keeps at least two entries so a default set is never empty", () => {
    expect(GENERATOR_CATALOGUE.length).toBeGreaterThanOrEqual(2);
    expect(DEFAULT_GENERATOR_KEYS.length).toBeGreaterThanOrEqual(2);
  });

  it("builds the default set from catalogue entries only", () => {
    for (const key of DEFAULT_GENERATOR_KEYS) {
      expect(getCatalogueEntry(key)).toBeDefined();
    }
  });

  it("looks entries up by key and returns nothing for an unknown key", () => {
    expect(getCatalogueEntry("settlement")?.slug).toBe("settlement");
    expect(getCatalogueEntry("zzz")).toBeUndefined();
  });

  it("leaves out generators that do not read the Session Hub", () => {
    const slugs = GENERATOR_CATALOGUE.map((g) => g.slug);
    expect(slugs).not.toContain("adventure-generator");
  });
});
