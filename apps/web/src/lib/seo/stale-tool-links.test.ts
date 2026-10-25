import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Legacy /tools URLs that are no longer real pages: two 301 stubs and one
 * that canonicalises to its generator route. Site content must link the
 * canonical route instead (#4392).
 */
const STALE = [
  "/tools/dnd-npc-generator",
  "/tools/faction-generator",
  "/tools/fantasy-name-generator",
];

/** Files that legitimately name the legacy paths: the routes themselves and route bookkeeping. */
const ALLOWED = [
  "src/routes/(marketing)/tools/",
  "src/lib/content/discovery/",
  "src/lib/seo/indexnow.ts",
  "src/lib/seo/sitemap-routes.ts",
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|svelte|md|json|txt)$/.test(name) && !/\.test\.ts$/.test(name)
      ? [path]
      : [];
  });
}

/** apps/web, resolved from this file so the scan does not depend on cwd. */
const root = join(import.meta.dirname, "../../..");

describe("stale legacy tool links", () => {
  it("are not linked from site content or llms.txt", () => {
    const files = [
      ...sourceFiles(join(root, "src")),
      join(root, "static/llms.txt"),
    ];
    const offenders = files.flatMap((file) => {
      const rel = relative(root, file);
      if (ALLOWED.some((allowed) => rel.startsWith(allowed))) return [];
      const text = readFileSync(file, "utf8");
      return STALE.filter((path) => text.includes(path)).map(
        (path) => `${rel}: ${path}`,
      );
    });
    expect(offenders).toEqual([]);
  });
});
