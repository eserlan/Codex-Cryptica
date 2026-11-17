import { safeJsonLd } from "#lib/utils/json-ld.js";
import { buildAbsoluteUrl } from "#lib/seo/site.js";
import type { TopicListItem } from "./directory";

/** `CollectionPage` whose `ItemList` is the live topic hubs. */
export function buildTopicDirectoryJsonLd(
  topics: readonly TopicListItem[],
  description: string,
): string {
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Topics",
    description,
    url: buildAbsoluteUrl("/topics"),
    mainEntity: {
      "@type": "ItemList",
      name: "Codex Cryptica topic hubs",
      itemListElement: topics.map((topic, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "WebPage",
          name: topic.title,
          url: buildAbsoluteUrl(topic.href),
          description: topic.summary,
        },
      })),
    },
  });
}

/** `BreadcrumbList` for the directory: Home > Explore > Topics. */
export function buildTopicDirectoryBreadcrumbJsonLd(): string {
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "Home", path: "/" },
      { name: "Explore", path: "/explore" },
      { name: "Topics", path: "/topics" },
    ].map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: buildAbsoluteUrl(crumb.path),
    })),
  });
}
