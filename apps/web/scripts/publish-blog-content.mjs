#!/usr/bin/env node
/**
 * Reads blog .md files, parses frontmatter, and writes:
 *   - out/<slug>.md  (each article)
 *   - out/index.json (index of all articles sorted by publishedAt desc)
 *
 * Usage: node scripts/publish-blog-content.mjs [--out <dir>]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outDir =
  outIdx !== -1
    ? path.resolve(args[outIdx + 1])
    : path.join(root, "blog-out");

const blogDir = path.join(root, "src", "lib", "content", "blog");

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^"|"$/g, "");
    if (key && val && !val.startsWith("[")) fm[key] = val;
  }
  return fm;
}

const files = fs
  .readdirSync(blogDir)
  .filter((f) => f.endsWith(".md") && f !== "front-page.md");

const index = [];

fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  const raw = fs.readFileSync(path.join(blogDir, file), "utf8");
  const fm = parseFrontmatter(raw);
  if (!fm.id || !fm.slug || !fm.title || !fm.description || !fm.publishedAt) {
    console.warn(`Skipping ${file}: missing required frontmatter fields`);
    continue;
  }
  fs.copyFileSync(path.join(blogDir, file), path.join(outDir, file));
  index.push({
    id: fm.id,
    slug: fm.slug,
    title: fm.title,
    description: fm.description,
    publishedAt: fm.publishedAt,
  });
}

index.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
fs.writeFileSync(path.join(outDir, "index.json"), JSON.stringify(index, null, 2));

console.log(`Published ${index.length} articles to ${outDir}`);
console.log(index.map((a) => `  ${a.slug}`).join("\n"));
