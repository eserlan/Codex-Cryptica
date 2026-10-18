import { safeJsonLd } from "$lib/utils/json-ld";
import { buildAbsoluteUrl } from "$lib/seo/site";
import type { TopicJobHubConfig } from "./job-hub-types";

/** Every distinct page the hub links to, in reading order. */
export function listJobHubLinks(config: TopicJobHubConfig) {
  const seen = new Set<string>();
  return [
    ...config.primaryCta.supportingLinks,
    ...config.jobs.flatMap((job) => job.links),
  ].filter((link) => !seen.has(link.href) && seen.add(link.href));
}

export function buildJobHubJsonLd(config: TopicJobHubConfig): string {
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
      itemListElement: listJobHubLinks(config).map((link, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "WebPage",
          name: link.title,
          url: buildAbsoluteUrl(link.href),
          description: link.description,
        },
      })),
    },
  });
}

export function buildJobHubBreadcrumbJsonLd(config: TopicJobHubConfig): string {
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "Home", path: "/" },
      { name: "Explore", path: "/explore" },
      {
        name: config.structuredData.breadcrumbLabel,
        path: config.canonicalPath,
      },
    ].map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: buildAbsoluteUrl(crumb.path),
    })),
  });
}
