import { describe, expect, it } from "vitest";
import { HUB_THEME_SLUGS } from "#lib/content/hub-themes.js";
import { themeConfig } from "./theme-config";
import {
  generatorCardUrl,
  hubCanonicalUrl,
  hubStructuredData,
} from "./theme-hub-metadata";

describe("theme hub metadata", () => {
  it.each(HUB_THEME_SLUGS)(
    "describes the collection, ordered cards and breadcrumbs for %s",
    (theme) => {
      const config = themeConfig[theme];
      const url = `https://codexcryptica.com/generators/${theme}`;
      const [collection, list, breadcrumbs] = hubStructuredData(
        theme,
        config,
      ).map((json) => JSON.parse(json));
      expect(hubCanonicalUrl(theme)).toBe(url);
      expect(collection).toEqual({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: config.metaTitle,
        description: config.metaDescription,
        url,
        inLanguage: "en",
      });
      expect(list).toMatchObject({
        "@type": "ItemList",
        numberOfItems: config.cards.length,
        url,
      });
      expect(list.itemListElement).toEqual(
        config.cards.map((card, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: card.label,
          description: card.summary,
          url: `https://codexcryptica.com/generators/${card.slug === "random" ? "random" : `${theme}/${card.slug}`}`,
        })),
      );
      expect(
        breadcrumbs.itemListElement.map((item: { item: string }) => item.item),
      ).toEqual([
        "https://codexcryptica.com",
        "https://codexcryptica.com/generators",
        url,
      ]);
    },
  );

  it("keeps Surprise Me outside the theme path and respects deployment prefixes", () => {
    expect(generatorCardUrl("/codex", "pirate", "ship-generator")).toBe(
      "/codex/generators/pirate/ship-generator",
    );
    expect(generatorCardUrl("/codex", "pirate", "random")).toBe(
      "/codex/generators/random",
    );
    expect(generatorCardUrl("", "fantasy", "npc")).toBe(
      "/generators/fantasy/npc",
    );
  });

  it("safely serialises hostile content without closing a script tag", () => {
    const config = {
      ...themeConfig.fantasy,
      metaTitle: "</script><script>alert(1)</script>",
    };
    const [collection] = hubStructuredData("fantasy", config);
    expect(collection).not.toContain("</script>");
    expect(JSON.parse(collection).name).toBe(config.metaTitle);
  });
});
