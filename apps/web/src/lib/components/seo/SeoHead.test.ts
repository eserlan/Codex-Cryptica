/** @vitest-environment jsdom */

import { render } from "@testing-library/svelte";
import { describe, expect, it, afterEach } from "vitest";
import SeoHead from "./SeoHead.svelte";

describe("SeoHead component", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("renders website Open Graph and Twitter Card tags", () => {
    render(SeoHead, {
      props: {
        title: "Plot Twist Generator | Codex Cryptica",
        description: "Generate coherent RPG plot twists and complications.",
        canonicalUrl:
          "https://codexcryptica.com/generators/plot-twist-generator",
        image:
          "https://assets.codexcryptica.com/screenshots/generator-plot-twist-generator.jpg",
        imageAlt: "Codex Cryptica plot twist generator preview card",
        keywords: ["plot twist", "rpg generator"],
      },
    });

    expect(document.title).toBe("Plot Twist Generator | Codex Cryptica");

    const descriptionMeta = document.querySelector('meta[name="description"]');
    expect(descriptionMeta?.getAttribute("content")).toBe(
      "Generate coherent RPG plot twists and complications.",
    );

    const keywordsMeta = document.querySelector('meta[name="keywords"]');
    expect(keywordsMeta?.getAttribute("content")).toBe(
      "plot twist, rpg generator",
    );

    const canonicalLink = document.querySelector('link[rel="canonical"]');
    expect(canonicalLink?.getAttribute("href")).toBe(
      "https://codexcryptica.com/generators/plot-twist-generator",
    );

    const ogType = document.querySelector('meta[property="og:type"]');
    expect(ogType?.getAttribute("content")).toBe("website");

    const ogTitle = document.querySelector('meta[property="og:title"]');
    expect(ogTitle?.getAttribute("content")).toBe(
      "Plot Twist Generator | Codex Cryptica",
    );

    const ogUrl = document.querySelector('meta[property="og:url"]');
    expect(ogUrl?.getAttribute("content")).toBe(
      "https://codexcryptica.com/generators/plot-twist-generator",
    );

    const ogImage = document.querySelector('meta[property="og:image"]');
    expect(ogImage?.getAttribute("content")).toBe(
      "https://assets.codexcryptica.com/screenshots/generator-plot-twist-generator.jpg",
    );

    const twitterCard = document.querySelector('meta[name="twitter:card"]');
    expect(twitterCard?.getAttribute("content")).toBe("summary_large_image");

    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    expect(twitterImage?.getAttribute("content")).toBe(
      "https://assets.codexcryptica.com/screenshots/generator-plot-twist-generator.jpg",
    );
  });

  it("renders article Open Graph tags with published_time and author", () => {
    render(SeoHead, {
      props: {
        title: "Your AI Co-GM | Codex Cryptica Blog",
        description: "A complete guide to the Lore Oracle.",
        canonicalUrl: "https://codexcryptica.com/blog/oracle-capabilities",
        type: "article",
        publishedTime: "2026-03-22T15:00:00Z",
        author: "Espen",
        image:
          "https://assets.codexcryptica.com/images/blog/oracle-capabilities/oracle-capabilities-hero.png",
        imageAlt: "Lore Oracle Hero",
        jsonLd:
          '{"@context":"https://schema.org","@type":"BlogPosting","headline":"Your AI Co-GM"}',
      },
    });

    const ogType = document.querySelector('meta[property="og:type"]');
    expect(ogType?.getAttribute("content")).toBe("article");

    const publishedMeta = document.querySelector(
      'meta[property="article:published_time"]',
    );
    expect(publishedMeta?.getAttribute("content")).toBe("2026-03-22T15:00:00Z");

    const authorMeta = document.querySelector(
      'meta[property="article:author"]',
    );
    expect(authorMeta?.getAttribute("content")).toBe("Espen");

    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    expect(scripts.length).toBe(1);
    expect(scripts[0].innerHTML).toContain("BlogPosting");
  });
});
