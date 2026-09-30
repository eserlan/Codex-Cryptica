import type { HelpArticleSource } from "./types";

/**
 * Minimal front-matter reader for help articles. It reads only the scalar
 * keys it needs (`id`, `title`, `hidden`), so this package needs no YAML
 * dependency. Returns null for files without front matter or an id, and for
 * hidden articles, which are not listed in the app and so are not cited.
 */
export function parseHelpArticle(raw: string): HelpArticleSource | null {
  const match = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/.exec(raw);
  if (!match) return null;
  const [, front, content] = match;
  const scalar = (key: string): string | null => {
    const hit = new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m").exec(front);
    return hit ? hit[1].replace(/^["']|["']$/g, "") : null;
  };
  if (scalar("hidden") === "true") return null;
  const id = scalar("id");
  const title = scalar("title");
  if (!id || !title) return null;
  return { id, title, content };
}
