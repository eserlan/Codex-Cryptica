import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";

/**
 * SC-007 / FR-022: nothing inside the authenticated vault application may call
 * the Idea Developer's tracking. Funnel events belong to public pages only.
 */
const src = resolve(__dirname, "../..", "..");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules") return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|svelte)$/.test(name) && !/\.test\.ts$/.test(name)
      ? [path]
      : [];
  });
}

const OWN = [
  `${sep}lib${sep}services${sep}idea-developer${sep}`,
  `${sep}lib${sep}components${sep}idea-developer${sep}`,
  `${sep}lib${sep}stores${sep}idea-developer.svelte.ts`,
  `${sep}lib${sep}services${sep}analytics${sep}idea-developer-tracking.ts`,
  `${sep}routes${sep}(marketing)${sep}tools${sep}idea-developer${sep}`,
];

const IMPORT = /from\s+["'][^"']*idea-developer[^"']*["']/;

describe("Idea Developer tracking stays out of the authenticated app", () => {
  const files = walk(src);
  const outsiders = files.filter((f) => !OWN.some((own) => f.includes(own)));

  it("scans the app", () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files.some((f) => f.includes(`${sep}routes${sep}(app)${sep}`))).toBe(
      true,
    );
  });

  it("no file in the authenticated app imports any Idea Developer module", () => {
    const appFiles = outsiders.filter((f) =>
      f.includes(`${sep}routes${sep}(app)${sep}`),
    );
    const offenders = appFiles.filter((f) =>
      IMPORT.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("no shared file outside the feature imports the tracker", () => {
    const offenders = outsiders.filter((f) =>
      /idea-developer-tracking/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("only the feature's own store, components and page import the tracker", () => {
    const importers = files
      .filter((f) =>
        /from\s+["'][^"']*idea-developer-tracking["']/.test(
          readFileSync(f, "utf8"),
        ),
      )
      .map((f) => f.replace(src, ""));
    for (const file of importers) {
      expect(
        OWN.some((own) => file.includes(own.replace(src, ""))) ||
          file.includes("idea-developer"),
      ).toBe(true);
    }
  });
});
