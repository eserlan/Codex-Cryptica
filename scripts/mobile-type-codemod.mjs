#!/usr/bin/env bun
// Maps sub-12px arbitrary text sizes to the semantic mobile type tokens (#3718).
// Usage: bun scripts/mobile-type-codemod.mjs [--write] [dir...]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MAP = {
  8: "text-nano",
  9: "text-nano",
  10: "text-micro",
  11: "text-meta",
};
const EXT = /\.(svelte|ts|html)$/;
const args = process.argv.slice(2);
const write = args.includes("--write");
const roots = args.filter((a) => !a.startsWith("--"));
if (roots.length === 0) roots.push("apps/web/src", "packages");

const SKIP = /\.test\.ts$|(^|\/)(node_modules|\.svelte-kit)(\/|$)/;
const walk = (dir) =>
  readdirSync(dir, { recursive: true })
    .filter((rel) => EXT.test(rel) && !SKIP.test(rel))
    .map((rel) => join(dir, rel));

let files = 0;
let replaced = 0;
for (const root of roots) {
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    let n = 0;
    const next = src.replace(
      /(?<![\w-])(?<variant>(?:[a-z0-9-]+:)*)text-\[(8|9|10|11)px\]/g,
      (_m, variant, px) => {
        n++;
        return `${variant}${MAP[px]}`;
      },
    );
    if (n > 0) {
      files++;
      replaced += n;
      if (write) writeFileSync(file, next);
    }
  }
}
console.log(
  `${write ? "Rewrote" : "Would rewrite"} ${replaced} uses in ${files} files`,
);
