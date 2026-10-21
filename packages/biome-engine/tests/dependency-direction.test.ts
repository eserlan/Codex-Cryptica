import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "..", "src");
const FORBIDDEN =
  /from\s+["'](map-engine|hex-crawl-engine|generator-engine|svelte|\$lib|@sveltejs)[^"']*["']|from\s+["'][./]*apps\/web/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : path.endsWith(".ts")
        ? [path]
        : [];
  });
}

describe("biome-engine dependency direction", () => {
  it("does not import map, hex-crawl, generator, Svelte or app code", () => {
    const offenders = sourceFiles(SRC).filter((file) =>
      FORBIDDEN.test(readFileSync(file, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
