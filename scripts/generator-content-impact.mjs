#!/usr/bin/env node

/**
 * Advisory review map for public generator changes (#4309).
 *
 * Usage:
 *   node scripts/generator-content-impact.mjs --base origin/staging
 *   node scripts/generator-content-impact.mjs --all
 *
 * This report is read-only, never changes published text, and never blocks CI.
 * Expand the focused mapping only when a generator's public behaviour warrants it.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const baseIndex = args.indexOf("--base");
const base = baseIndex >= 0 ? args[baseIndex + 1] : "origin/staging";
const showAll = args.includes("--all");

const GENERATORS = [
  {
    id: "heist",
    path: "/generators/heist",
    changed: /(?:^|\/)(?:public-heist|.*heist.*|generator-engine-worldbuilding)\.[cm]?[jt]s$/,
    hints: ["heist", "/generators/heist", "Heist Generator"],
  },
  {
    id: "point-crawl",
    path: "/generators/point-crawl",
    changed: /(?:^|\/)(?:public-point-crawl|.*point-crawl.*)\.[cm]?[jt]s$/,
    hints: ["point crawl", "point-crawl", "/generators/point-crawl"],
  },
];

const CONTENT_DIRS = [
  "apps/web/src/lib/content/answers/pages",
  "apps/web/src/lib/content/topics",
  "apps/web/src/lib/content/for",
  "apps/web/src/lib/content/examples",
  "apps/web/src/routes/(marketing)/tools",
];
const ENGINE_PREFIXES = [
  "packages/generator-engine/src/",
  "apps/web/src/lib/services/seo/",
  "apps/web/src/lib/components/seo/",
];

function filesUnder(directory) {
  const results = [];
  if (!existsSync(directory)) return results;
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) results.push(...filesUnder(path));
    else if (item.isFile() && /\.(?:svelte|ts|md)$/.test(item.name)) {
      results.push(path);
    }
  }
  return results;
}

let changed = [];
try {
  if (!showAll) {
    changed = execFileSync("git", ["diff", "--name-only", base, "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
      .split("\n")
      .filter(Boolean)
      .map((file) => file.replaceAll("\\", "/"));
  }
} catch (err) {
  console.log("Generator copy review: cannot read git diff; review manually.");
  process.exit(0);
}

const touched = GENERATORS.filter((item) =>
  showAll ||
  changed.some(
    (file) =>
      ENGINE_PREFIXES.some((prefix) => file.startsWith(prefix)) &&
      item.changed.test(file),
  ),
);
if (touched.length === 0) {
  console.log("Generator copy review: no mapped public-generator changes detected.");
  process.exit(0);
}

const contentFiles = CONTENT_DIRS.flatMap((dir) => filesUnder(join(ROOT, dir)));
console.log("## Generator → public content review (advisory)");
console.log("Review these candidates when output fields, capabilities or limitations change.");
console.log("Mark reviewed/no change needed in the PR; no automatic edits are made.\n");

for (const item of touched) {
  const linked = contentFiles
    .filter((file) => {
      const body = readFileSync(file, "utf8").toLowerCase();
      return item.hints.some((hint) => body.includes(hint.toLowerCase()));
    })
    .map((file) => relative(ROOT, file).replaceAll("\\", "/"))
    .sort();

  console.log(`### ${item.id} — ${item.path}`);
  if (linked.length === 0) console.log("- No matching public references found");
  for (const file of linked) console.log(`- ${file}`);
  console.log("");
}
