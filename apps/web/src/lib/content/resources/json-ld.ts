import { safeJsonLd } from "$lib/utils/json-ld";
import { buildAbsoluteUrl } from "$lib/seo/site";
import type { FloorplanResource } from "./castle-floorplans";

/**
 * `CollectionPage` wrapping an `ItemList` of external `WebPage` items: this
 * page curates outbound links rather than hosting the plans itself, so the
 * listed items point at the original publishers, not at Codex Cryptica.
 */
export function buildCastleFloorplansJsonLd(
  resources: FloorplanResource[],
): string {
  return safeJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Great Castle Floorplans for RPGs and Worldbuilding",
    url: buildAbsoluteUrl("/resources/castle-floorplans"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: resources.map((resource, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "WebPage",
          name: resource.name,
          url: resource.url,
          description: resource.description,
        },
      })),
    },
  });
}

export function buildCastleFloorplansBreadcrumbJsonLd(): string {
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
        name: "Castle Floorplans",
        item: buildAbsoluteUrl("/resources/castle-floorplans"),
      },
    ],
  });
}
