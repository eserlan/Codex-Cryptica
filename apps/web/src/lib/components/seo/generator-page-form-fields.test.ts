import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rendererSource = readFileSync(
  resolve(
    process.cwd(),
    "src/lib/components/seo/GeneratorPageFormFields.svelte",
  ),
  "utf8",
);
const pageSource = readFileSync(
  resolve(process.cwd(), "src/lib/components/seo/GeneratorPageContent.svelte"),
  "utf8",
);

describe("GeneratorPageFormFields extraction", () => {
  it("owns every generator slug branch", () => {
    const expectedBranches = [
      'slug === "npc"',
      'slug === "settlement"',
      'slug === "magic-item" || slug === "item"',
      'slug === "faction-roster"',
      'slug === "pantheon-generator" || slug === "god-generator"',
      'slug === "adventure-generator" || slug === "adventure-idea-generator"',
      'slug === "comic-book-event-generator"',
      'slug === "villain-scheme-generator"',
      'slug === "alien-race"',
    ];

    for (const branch of expectedBranches) {
      expect(rendererSource).toContain(branch);
    }

    expect(rendererSource).not.toContain("handlePersonalityGenreChange");
  });

  it("is rendered through the original SEO layout snippet", () => {
    expect(pageSource).toContain("{#snippet formFields(trigger)}");
    expect(pageSource).toContain("<GeneratorPageFormFields");
    expect(pageSource).toContain("{trigger}");
    expect(pageSource).toContain("{/snippet}");
  });
});
