import { safeJsonLd } from "#lib/utils/json-ld.js";
import type { ThemeSlug } from "./+page";
import type { ThemeConfig } from "./theme-config";

export const hubOrigin = "https://codexcryptica.com";
const origin = hubOrigin;

export function hubCanonicalUrl(theme: ThemeSlug): string {
  return `${origin}/generators/${theme}`;
}

export function generatorCardUrl(
  prefix: string,
  theme: ThemeSlug,
  slug: string,
): string {
  const path = slug === "random" ? slug : `${theme}/${slug}`;
  return `${prefix}/generators/${path}`;
}

function collectionPageJsonLd(theme: ThemeSlug, config: ThemeConfig) {
  const canonicalUrl = hubCanonicalUrl(theme);
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: config.metaTitle,
    description: config.metaDescription,
    url: canonicalUrl,
    inLanguage: "en",
  });
}

function itemListJsonLd(theme: ThemeSlug, config: ThemeConfig) {
  const canonicalUrl = hubCanonicalUrl(theme);
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${config.label} RPG Generators`,
    description: config.metaDescription,
    url: canonicalUrl,
    numberOfItems: config.cards.length,
    itemListElement: config.cards.map((card, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: card.label,
      description: card.summary,
      url: generatorCardUrl(origin, theme, card.slug),
    })),
  });
}

function breadcrumbJsonLd(theme: ThemeSlug, config: ThemeConfig) {
  const canonicalUrl = hubCanonicalUrl(theme);
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Codex Cryptica",
        item: origin,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "RPG Generators",
        item: `${origin}/generators`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${config.label} Generators`,
        item: canonicalUrl,
      },
    ],
  });
}

export function hubStructuredData(
  theme: ThemeSlug,
  config: ThemeConfig,
): string[] {
  return [
    collectionPageJsonLd(theme, config),
    itemListJsonLd(theme, config),
    breadcrumbJsonLd(theme, config),
  ];
}
