import { safeJsonLd } from "$lib/utils/json-ld";
import { buildAbsoluteUrl } from "$lib/seo/site";
import { HEIST_TOPIC_CONFIG } from "./heists";

/**
 * `CollectionPage` structured data representing the Heist topic hub as an
 * authoritative collection of related guides, worked examples, and generation tools.
 */
export function buildHeistTopicJsonLd(): string {
  const items = [
    ...HEIST_TOPIC_CONFIG.coreGuides.map((guide) => ({
      name: guide.title,
      url: buildAbsoluteUrl(guide.href),
      description: guide.description,
    })),
    ...HEIST_TOPIC_CONFIG.workedExamples.map((example) => ({
      name: example.title,
      url: buildAbsoluteUrl(example.href),
      description: example.description,
    })),
    ...HEIST_TOPIC_CONFIG.generators.map((tool) => ({
      name: tool.title,
      url: buildAbsoluteUrl(tool.href),
      description: tool.description,
    })),
  ];

  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: HEIST_TOPIC_CONFIG.title,
    headline: HEIST_TOPIC_CONFIG.title,
    description: HEIST_TOPIC_CONFIG.description,
    url: buildAbsoluteUrl(HEIST_TOPIC_CONFIG.canonicalPath),
    about: {
      "@type": "Thing",
      name: "Tabletop RPG Heists",
      description:
        "Designing, preparing, and running heist adventures in tabletop roleplaying games.",
    },
    mainEntity: {
      "@type": "ItemList",
      name: "RPG Heist Resources & Tools",
      description:
        "Curated collection of RPG heist frameworks, target design checklists, worked examples, and generation tools.",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "WebPage",
          name: item.name,
          url: item.url,
          description: item.description,
        },
      })),
    },
  });
}

/**
 * `BreadcrumbList` structured data for `/topics/heists`.
 */
export function buildHeistTopicBreadcrumbJsonLd(): string {
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
        name: "Explore",
        item: buildAbsoluteUrl("/explore"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "RPG Heists Topic Hub",
        item: buildAbsoluteUrl(HEIST_TOPIC_CONFIG.canonicalPath),
      },
    ],
  });
}
