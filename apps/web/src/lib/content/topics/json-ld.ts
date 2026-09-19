import { safeJsonLd } from "$lib/utils/json-ld";
import { buildAbsoluteUrl } from "$lib/seo/site";
import type { TopicHubConfig } from "./types";

/**
 * `CollectionPage` structured data representing a topic hub as an
 * authoritative collection of related guides, worked examples, and generation tools.
 */
export function buildTopicJsonLd(config: TopicHubConfig): string {
  const items = [
    ...config.coreGuides,
    ...config.workedExamples,
    ...config.generators,
  ].map((entry) => ({
    name: entry.title,
    url: buildAbsoluteUrl(entry.href),
    description: entry.description,
  }));

  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: config.title,
    headline: config.title,
    description: config.description,
    url: buildAbsoluteUrl(config.canonicalPath),
    about: {
      "@type": "Thing",
      name: config.structuredData.aboutName,
      description: config.structuredData.aboutDescription,
    },
    mainEntity: {
      "@type": "ItemList",
      name: config.structuredData.itemListName,
      description: config.structuredData.itemListDescription,
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
 * `BreadcrumbList` structured data for a topic hub: Home > Explore > hub.
 */
export function buildTopicBreadcrumbJsonLd(config: TopicHubConfig): string {
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
        name: config.structuredData.breadcrumbLabel,
        item: buildAbsoluteUrl(config.canonicalPath),
      },
    ],
  });
}
