import { describe, expect, it } from "vitest";
import {
  buildFaqJsonLd,
  buildSoftwareApplicationJsonLd,
  buildBreadcrumbJsonLd,
  buildResultJsonLd,
} from "./generator-json-ld";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";

describe("buildFaqJsonLd", () => {
  it("returns an empty string when there are no faqs", () => {
    expect(buildFaqJsonLd([])).toBe("");
  });

  it("builds a FAQPage schema from the given faqs", () => {
    const json = buildFaqJsonLd([
      { question: "Q1?", answer: "A1." },
      { question: "Q2?", answer: "A2." },
    ]);
    const parsed = JSON.parse(json);
    expect(parsed["@type"]).toBe("FAQPage");
    expect(parsed.mainEntity).toHaveLength(2);
    expect(parsed.mainEntity[0].name).toBe("Q1?");
    expect(parsed.mainEntity[0].acceptedAnswer.text).toBe("A1.");
  });
});

describe("buildSoftwareApplicationJsonLd", () => {
  it("uses the tools URL fallback when canonicalPath is missing", () => {
    const json = buildSoftwareApplicationJsonLd({
      canonicalPath: undefined,
      metaDescription: "desc",
      faqs: [],
    });
    const parsed = JSON.parse(json);
    expect(parsed.url).toBe("https://codexcryptica.com/tools");
    expect(parsed.mainEntity).toBeUndefined();
  });

  it("includes an embedded FAQPage mainEntity when faqs are present", () => {
    const json = buildSoftwareApplicationJsonLd({
      canonicalPath: "/generators/npc",
      metaDescription: "desc",
      faqs: [{ question: "Q?", answer: "A." }],
    });
    const parsed = JSON.parse(json);
    expect(parsed.url).toBe("https://codexcryptica.com/generators/npc");
    expect(parsed.mainEntity["@type"]).toBe("FAQPage");
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("falls back to the tools URL for the final crumb when canonicalPath is missing", () => {
    const json = buildBreadcrumbJsonLd({
      canonicalPath: undefined,
      introTitle: "NPC Generator",
    });
    const parsed = JSON.parse(json);
    expect(parsed.itemListElement[2].item).toBe(
      "https://codexcryptica.com/tools",
    );
    expect(parsed.itemListElement[2].name).toBe("NPC Generator");
  });
});

describe("buildResultJsonLd", () => {
  const base: GeneratorOutput = {
    type: "character",
    title: "Test Title",
    summary: "Test summary",
    content: "Test content",
    lore: "",
    labels: [],
    status: "draft",
  };

  it("returns null when there is no generated data", () => {
    expect(buildResultJsonLd(null)).toBeNull();
  });

  it("builds a Person schema for character type", () => {
    const parsed = JSON.parse(buildResultJsonLd(base)!);
    expect(parsed["@type"]).toBe("Person");
    expect(parsed.jobTitle).toBe("Fictional Character");
  });

  it("builds a Place schema for location type", () => {
    const parsed = JSON.parse(
      buildResultJsonLd({ ...base, type: "location" })!,
    );
    expect(parsed["@type"]).toBe("Place");
  });

  it("builds a CreativeWork schema for any other type", () => {
    const parsed = JSON.parse(buildResultJsonLd({ ...base, type: "faction" })!);
    expect(parsed["@type"]).toBe("CreativeWork");
    expect(parsed.genre).toBe("Fantasy / RPG Campaign Lore");
  });

  it("falls back to a content slice when summary is missing", () => {
    const parsed = JSON.parse(buildResultJsonLd({ ...base, summary: "" })!);
    expect(parsed.description).toBe("Test content");
  });
});
