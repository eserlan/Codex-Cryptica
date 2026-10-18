import { safeJsonLd } from "$lib/utils/json-ld";
import { buildAbsoluteUrl } from "$lib/seo/site";
import type {
  TopicBeginnerHubConfig,
  TopicLearningStepLink,
} from "./beginner-hub-types";

/** Every distinct page the beginner hub links to, in reading order. */
export function listBeginnerHubLinks(
  config: TopicBeginnerHubConfig,
): TopicLearningStepLink[] {
  const seen = new Set<string>();
  const candidates: TopicLearningStepLink[] = [
    config.startHere.primaryLink,
    ...config.learningSteps.flatMap((step) => step.links),
    ...config.toolsAndNextSteps.links,
  ];

  return candidates.filter(
    (link) => !seen.has(link.href) && seen.add(link.href),
  );
}

export function buildBeginnerHubJsonLd(config: TopicBeginnerHubConfig): string {
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
      itemListElement: listBeginnerHubLinks(config).map((link, index) => ({
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

export function buildBeginnerHubBreadcrumbJsonLd(
  config: TopicBeginnerHubConfig,
): string {
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
