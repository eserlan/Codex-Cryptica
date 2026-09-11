export type PublicContentKind =
  "answer" | "example" | "landing" | "blog" | "generator" | "tool";

export interface PublicContentItem {
  kind: PublicContentKind;
  title: string;
  url: string;
  imageUrl?: string;
  imageAlt?: string;
  sourcePath: string;
}

const SITE_URL = "https://codexcryptica.com";
const GENERATOR_FALLBACK_IMAGE =
  "https://assets.codexcryptica.com/screenshots/feature-connect.jpg";
const GENERATOR_FALLBACK_IMAGE_ALT =
  "A Codex Cryptica campaign vault showing an entity graph beside an open character record";

function quoted(source: string, field: string): string | undefined {
  return source.match(new RegExp(`${field}:\\s*["']([^"']+)["']`))?.[1];
}

function yaml(source: string, field: string): string | undefined {
  return source
    .match(new RegExp(`^${field}:\\s*["']?([^\\n"']+)["']?\\s*$`, "m"))?.[1]
    ?.trim();
}

/**
 * Extract one newly registered generator from the metadata catalogue. The
 * caller supplies the key from the zero-context git diff, so an edit to the
 * catalogue cannot accidentally promote every generator in it.
 */
export function discoverGeneratorPublicContent(
  source: string,
  slug: string,
  sourcePath: string,
): PublicContentItem | null {
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const section = source.match(
    new RegExp(
      `^  ["']?${escapedSlug}["']?: \\{([\\s\\S]*?)(?=^  ["']?[a-z0-9-]+["']?: \\{|^};)`,
      "m",
    ),
  )?.[1];
  if (!section) return null;

  const canonicalPath = quoted(section, "canonicalPath");
  if (!canonicalPath) return null;
  return {
    kind: "generator",
    title:
      quoted(section, "introTitle") ?? quoted(section, "pageTitle") ?? slug,
    url: `${SITE_URL}${canonicalPath}`,
    imageUrl: quoted(section, "ogImage") ?? GENERATOR_FALLBACK_IMAGE,
    imageAlt: quoted(section, "ogImageAlt") ?? GENERATOR_FALLBACK_IMAGE_ALT,
    sourcePath,
  };
}

/** Extract a publishable public page from a changed source file. */
export function discoverPublicContent(
  sourcePath: string,
  source: string,
): PublicContentItem | null {
  const slug = quoted(source, "slug") ?? yaml(source, "slug");
  const imageUrl = quoted(source, "image") ?? quoted(source, "src");
  const imageAlt = quoted(source, "imageAlt") ?? quoted(source, "alt");

  if (sourcePath.includes("/answers/pages/") && slug) {
    return {
      kind: "answer",
      title: quoted(source, "question") ?? slug,
      url: `${SITE_URL}/answers/${slug}`,
      imageUrl,
      imageAlt,
      sourcePath,
    };
  }
  if (sourcePath.includes("/examples/pages/") && slug) {
    return {
      kind: "example",
      title: quoted(source, "title") ?? quoted(source, "name") ?? slug,
      url: `${SITE_URL}/examples/${slug}`,
      imageUrl,
      imageAlt,
      sourcePath,
    };
  }
  if (sourcePath.includes("/content/for/packs/") && slug) {
    return {
      kind: "landing",
      title: quoted(source, "title") ?? slug,
      url: `${SITE_URL}/for/${slug}`,
      imageUrl,
      imageAlt,
      sourcePath,
    };
  }
  if (sourcePath.includes("/content/blog/") && slug) {
    return {
      kind: "blog",
      title: yaml(source, "title") ?? slug,
      url: `${SITE_URL}/blog/${slug}`,
      imageUrl: yaml(source, "image"),
      imageAlt: yaml(source, "imageAlt"),
      sourcePath,
    };
  }
  const toolMatch = sourcePath.match(
    /\/routes\/\(marketing\)\/tools\/([^/]+)\//,
  );
  if (toolMatch) {
    const canonicalPath =
      quoted(source, "canonicalPath") ?? `/tools/${toolMatch[1]}`;
    return {
      kind: "tool",
      title:
        quoted(source, "introTitle") ??
        quoted(source, "pageTitle") ??
        toolMatch[1],
      url: `${SITE_URL}${canonicalPath}`,
      imageUrl: quoted(source, "ogImage") ?? GENERATOR_FALLBACK_IMAGE,
      imageAlt: quoted(source, "ogImageAlt") ?? GENERATOR_FALLBACK_IMAGE_ALT,
      sourcePath,
    };
  }
  return null;
}
