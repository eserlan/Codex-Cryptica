import { safeJsonLd } from "$lib/utils/json-ld";
import { buildAbsoluteUrl } from "$lib/seo/site";
import type { ExampleConfig } from "./schema";
import { examplePath } from "./registry";

/**
 * `CreativeWork` rather than `Article`: the page's substance is a generated
 * artefact with commentary around it, not an authored article about a topic.
 */
export function buildExampleJsonLd(example: ExampleConfig): string {
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: example.name,
    headline: example.title,
    description: example.summary,
    genre: example.genre,
    url: buildAbsoluteUrl(examplePath(example)),
    isPartOf: {
      "@type": "Collection",
      name: "Codex Cryptica generator examples",
      url: buildAbsoluteUrl("/examples"),
    },
    ...(example.image ? { image: example.image.src } : {}),
  });
}

/** Home → Examples → this example. */
export function buildExampleBreadcrumbJsonLd(example: ExampleConfig): string {
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: buildAbsoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Examples",
        item: buildAbsoluteUrl("/examples"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: example.name,
        item: buildAbsoluteUrl(examplePath(example)),
      },
    ],
  });
}

/** The index as an ItemList, so the hub is crawlable as a collection. */
export function buildExampleIndexJsonLd(examples: ExampleConfig[]): string {
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Codex Cryptica generator examples",
    itemListElement: examples.map((example, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: example.name,
      url: buildAbsoluteUrl(examplePath(example)),
    })),
  });
}
