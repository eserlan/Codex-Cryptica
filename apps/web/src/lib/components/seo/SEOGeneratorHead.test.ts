/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/svelte";
import SEOGeneratorHead from "./SEOGeneratorHead.svelte";

describe("SEOGeneratorHead", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("assembles page, FAQ and fallback social metadata", () => {
    render(SEOGeneratorHead, {
      props: {
        title: "NPC Generator",
        description: "Create a character.",
        introTitle: "RPG NPC Generator",
        canonicalPath: "/generators/npc",
        faqs: [{ question: "Can I save it?", answer: "Yes." }],
        generatedData: null,
      },
    });

    const schemas = [
      ...document.querySelectorAll('script[type="application/ld+json"]'),
    ].map((script) => JSON.parse(script.textContent ?? ""));
    expect(schemas.map((schema) => schema["@type"])).toEqual([
      "SoftwareApplication",
      "BreadcrumbList",
      "FAQPage",
    ]);
    expect(
      document
        .querySelector('meta[property="og:image:alt"]')
        ?.getAttribute("content"),
    ).toBe(
      "A Codex Cryptica campaign vault showing an entity graph beside an open character record",
    );
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    ).toBe("https://codexcryptica.com/generators/npc");
  });

  it("adds result schema after generated output changes", () => {
    const { rerender } = render(SEOGeneratorHead, {
      props: {
        title: "NPC Generator",
        description: "Create a character.",
        introTitle: "RPG NPC Generator",
        generatedData: null,
      },
    });

    rerender({
      title: "NPC Generator",
      description: "Create a character.",
      introTitle: "RPG NPC Generator",
      generatedData: {
        type: "character",
        title: "Mira",
        content: "A patient cartographer.",
      } as never,
    });

    const result = [
      ...document.querySelectorAll('script[type="application/ld+json"]'),
    ]
      .map((script) => JSON.parse(script.textContent ?? ""))
      .find((schema) => schema["@type"] === "Person");
    expect(result).toMatchObject({ "@type": "Person", name: "Mira" });
  });
});
