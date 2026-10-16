import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The sidebar overview article names every Activity Bar button. The surface
 * audit makes a new button force a Help decision, but not an edit to this
 * article, so it would quietly go out of date. This is the check that keeps
 * the list the same as nav-items.ts.
 */
const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

/** Buttons whose label is a plain string in nav-items.ts. */
export function navLabels(navSource: string): string[] {
  return [...navSource.matchAll(/^\s+label: "([^"]+)",$/gm)].map(
    (match) => match[1],
  );
}

/** Labels the article does not show in bold, the way its tables name them. */
export function missingLabels(
  labels: readonly string[],
  article: string,
): string[] {
  return labels.filter((label) => !article.includes(`**${label}**`));
}

const nav = read("apps/web/src/lib/components/layout/nav-items.ts");
const article = read(
  "apps/web/src/lib/content/help/finding-your-way-around.md",
);

describe("sidebar overview article", () => {
  it("finds the buttons it is meant to check", () => {
    expect(navLabels(nav).length).toBeGreaterThan(8);
  });

  it("names every Activity Bar button", () => {
    expect(missingLabels(navLabels(nav), article)).toEqual([]);
  });

  it("names the buttons that do not have a plain label", () => {
    // The journal button's label changes with its state, and Ask Cif is not
    // part of nav-items.ts, so neither is found by the check above.
    expect(article).toContain("Session Journal");
    expect(article).toContain("**Ask Cif**");
  });

  it("reports a button the article leaves out", () => {
    const withNew = `${nav}\n      label: "Brand New",\n`;
    expect(missingLabels(navLabels(withNew), article)).toEqual(["Brand New"]);
  });
});
