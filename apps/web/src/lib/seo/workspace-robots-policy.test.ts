import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Cloudflare Pages applies this file before the client-only workspace mounts.
 * Keep the list deliberately path-specific: /import/* is public discovery
 * content, while /import is the in-app importer.
 */
const headersText = readFileSync(
  resolve(process.cwd(), "static/_headers"),
  "utf8",
);

const noindexRule = (path: string) =>
  new RegExp(
    path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      "\\n\\s+X-Robots-Tag: noindex, nofollow",
  );

describe("workspace robots policy", () => {
  it("protects every stateful workspace route family at the static host boundary", () => {
    for (const path of [
      "/adventure*",
      "/canvas*",
      "/decks*",
      "/dice*",
      "/guest*",
      "/help*",
      "/import",
      "/map*",
      "/oracle*",
      "/table*",
      "/tables*",
      "/templates*",
      "/timeline*",
      "/vault*",
    ]) {
      expect(headersText).toMatch(noindexRule(path));
    }
  });

  it("does not apply a broad guard that would exclude public discovery pages", () => {
    expect(headersText).not.toMatch(noindexRule("/*"));
    expect(headersText).not.toMatch(noindexRule("/import*"));
    expect(headersText).not.toMatch(noindexRule("/generators*"));
  });
});
