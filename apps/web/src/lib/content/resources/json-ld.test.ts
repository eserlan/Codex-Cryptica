import { describe, expect, it } from "vitest";
import {
  buildCastleFloorplansJsonLd,
  buildCastleFloorplansBreadcrumbJsonLd,
} from "./json-ld";
import type { FloorplanResource } from "./castle-floorplans";

const RESOURCES: FloorplanResource[] = [
  {
    id: "biltmore-estate",
    name: "Biltmore Estate",
    category: "palaces-manor-houses",
    url: "http://randwulf.com/hogwarts/Biltmore.html",
    sourceName: "Randwülf Floorplans",
    description: "A </script> tag in the wild.",
    whyUseful: "Because it is useful.",
    complexity: "sprawling",
    complexityNote: "6 levels",
  },
  {
    id: "great-castles-directory",
    name: "Great Castles floor plan directory",
    category: "historical-castles",
    url: "https://great-castles.com/floorplans.html",
    sourceName: "Great Castles",
    description: "An index of floor plans.",
    whyUseful: "Breadth is the point.",
    complexity: "directory",
    complexityNote: "200+ linked castles",
  },
];

describe("buildCastleFloorplansJsonLd", () => {
  it("builds a CollectionPage wrapping an ItemList of the resources", () => {
    const parsed = JSON.parse(buildCastleFloorplansJsonLd(RESOURCES));

    expect(parsed["@type"]).toBe("CollectionPage");
    expect(parsed.url).toBe(
      "https://codexcryptica.com/resources/castle-floorplans",
    );
    expect(parsed.mainEntity["@type"]).toBe("ItemList");
    expect(parsed.mainEntity.itemListElement).toHaveLength(2);

    const [first, second] = parsed.mainEntity.itemListElement;
    expect(first.position).toBe(1);
    expect(first.item["@type"]).toBe("WebPage");
    expect(first.item.name).toBe("Biltmore Estate");
    expect(first.item.url).toBe(
      "http://randwulf.com/hogwarts/Biltmore.html",
    );
    expect(second.position).toBe(2);
    expect(second.item.name).toBe("Great Castles floor plan directory");
  });

  it("returns an empty ItemList for no resources", () => {
    const parsed = JSON.parse(buildCastleFloorplansJsonLd([]));
    expect(parsed.mainEntity.itemListElement).toEqual([]);
  });

  it("escapes '<' so embedded content cannot close the surrounding script tag", () => {
    const json = buildCastleFloorplansJsonLd(RESOURCES);
    expect(json).not.toContain("</script>");
    expect(json).toContain("\\u003c/script>");
  });
});

describe("buildCastleFloorplansBreadcrumbJsonLd", () => {
  it("builds a three-item breadcrumb from Home to Explore to this page", () => {
    const parsed = JSON.parse(buildCastleFloorplansBreadcrumbJsonLd());

    expect(parsed["@type"]).toBe("BreadcrumbList");
    expect(parsed.itemListElement).toHaveLength(3);
    expect(parsed.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://codexcryptica.com/",
    });
    expect(parsed.itemListElement[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Explore",
      item: "https://codexcryptica.com/explore",
    });
    expect(parsed.itemListElement[2]).toEqual({
      "@type": "ListItem",
      position: 3,
      name: "Castle Floorplans",
      item: "https://codexcryptica.com/resources/castle-floorplans",
    });
  });

  it("gives each crumb a distinct URL so parent/child are valid", () => {
    const parsed = JSON.parse(buildCastleFloorplansBreadcrumbJsonLd());
    const urls = parsed.itemListElement.map((crumb: { item: string }) => crumb.item);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
