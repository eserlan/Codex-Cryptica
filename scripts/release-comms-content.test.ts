import { describe, expect, it } from "vitest";
import { discoverPublicContent } from "./release-comms-content.ts";
import { discoverGeneratorPublicContent } from "./release-comms-content.ts";

describe("discoverPublicContent", () => {
  it("discovers an answer with its direct URL and R2 card", () => {
    expect(
      discoverPublicContent(
        "apps/web/src/lib/content/answers/pages/city.ts",
        `slug: "city"\nquestion: "How?"\nimage: "https://assets.codexcryptica.com/og/city.jpg"\nimageAlt: "City card"`,
      ),
    ).toMatchObject({
      kind: "answer",
      url: "https://codexcryptica.com/answers/city",
      imageAlt: "City card",
    });
  });

  it("discovers an example and rejects unrelated source files", () => {
    expect(
      discoverPublicContent(
        "apps/web/src/lib/content/examples/pages/example.ts",
        `slug: "example"\ntitle: "Example"\nsrc: "https://assets.codexcryptica.com/example.jpg"\nalt: "Example card"`,
      ),
    ).toMatchObject({
      kind: "example",
      url: "https://codexcryptica.com/examples/example",
    });
    expect(
      discoverPublicContent("scripts/internal.ts", `slug: "nope"`),
    ).toBeNull();
  });

  it("discovers markdown blog frontmatter without inventing a missing image", () => {
    expect(
      discoverPublicContent(
        "apps/web/src/lib/content/blog/post.md",
        `---\nslug: post\ntitle: "Post title"\n---`,
      ),
    ).toEqual({
      kind: "blog",
      title: "Post title",
      url: "https://codexcryptica.com/blog/post",
      sourcePath: "apps/web/src/lib/content/blog/post.md",
    });
  });

  it("discovers a public tool with the verified generator social-image fallback", () => {
    expect(
      discoverPublicContent(
        "apps/web/src/routes/(marketing)/tools/vampire-clan-generator/+page.svelte",
        `metaOverrides={{ canonicalPath: "/tools/vampire-clan-generator", introTitle: "Vampire Clan Generator" }}`,
      ),
    ).toMatchObject({
      kind: "tool",
      url: "https://codexcryptica.com/tools/vampire-clan-generator",
      imageUrl:
        "https://assets.codexcryptica.com/screenshots/feature-connect.jpg",
    });
  });

  it("discovers only the newly registered generator's own page and image", () => {
    const source = `export const slugMeta = {
  npc: {
    introTitle: "RPG NPC Generator",
    canonicalPath: "/generators/npc",
    ogImage: "https://assets.codexcryptica.com/screenshots/generator-npc.jpg",
    ogImageAlt: "An NPC generator",
  },
  faction: { canonicalPath: "/generators/faction" },
};`;
    expect(
      discoverGeneratorPublicContent(
        source,
        "npc",
        "apps/web/src/lib/components/seo/generator-page-meta.ts",
      ),
    ).toMatchObject({
      kind: "generator",
      url: "https://codexcryptica.com/generators/npc",
      imageUrl:
        "https://assets.codexcryptica.com/screenshots/generator-npc.jpg",
    });
    expect(
      discoverGeneratorPublicContent(
        source,
        "missing",
        "generator-page-meta.ts",
      ),
    ).toBeNull();
  });

  it("discovers a generator registered under a quoted hyphenated slug", () => {
    const source = `export const slugMeta = {
  npc: { canonicalPath: "/generators/npc" },
  "magic-item": {
    introTitle: "Magic Item Generator",
    canonicalPath: "/generators/magic-item",
    ogImage: "https://assets.codexcryptica.com/screenshots/generator-magic-item.jpg",
    ogImageAlt: "A magic item generator",
  },
};`;
    expect(
      discoverGeneratorPublicContent(
        source,
        "magic-item",
        "apps/web/src/lib/components/seo/generator-page-meta.ts",
      ),
    ).toMatchObject({
      kind: "generator",
      url: "https://codexcryptica.com/generators/magic-item",
      imageUrl:
        "https://assets.codexcryptica.com/screenshots/generator-magic-item.jpg",
    });
  });
});
