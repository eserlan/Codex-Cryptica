/**
 * Post-build script: inline critical CSS into prerendered HTML pages.
 *
 * Critters identifies which CSS rules are needed to render above-the-fold
 * content, inlines them as <style> in <head>, and converts the original
 * <link rel="stylesheet"> to load asynchronously — eliminating the
 * render-blocking penalty.
 *
 * Only run on prerendered marketing/static pages, not the SPA shell
 * (index.html / 404.html).
 */

import Critters from "critters";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, join, relative, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = resolve(__dirname, "../build");

// SPA shell — skip, no meaningful prerendered content
const SKIP = new Set(["index.html", "404.html"]);

function findHtmlFiles(dir, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "_app") {
      findHtmlFiles(fullPath, results);
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".html") &&
      !SKIP.has(entry.name)
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

// SvelteKit generates relative CSS hrefs for pages in subdirectories
// (e.g. "../_app/immutable/assets/app.css"). Critters resolves paths
// against `publicPath`, so it can't follow relative `../` hrefs.
// Normalise them to absolute paths before processing, then restore.
function makeHrefsAbsolute(html, fileDir) {
  return html.replace(
    /(<link\b[^>]+\bhref=")([^"]+\.css)("[^>]*>)/g,
    (match, pre, href, post) => {
      if (href.startsWith("/") || href.startsWith("http")) return match;
      const abs = "/" + relative(buildDir, resolve(fileDir, href));
      return `${pre}${abs}${post}`;
    }
  );
}

const critters = new Critters({
  path: buildDir,
  publicPath: "/",
  // 'media' trick: <link media="print" onload="this.media='all'">
  preload: "media",
  pruneSource: false,
  fonts: false,
  logLevel: "warn",
});

const htmlFiles = findHtmlFiles(buildDir);
console.log(`[critters] Processing ${htmlFiles.length} prerendered pages…`);

let ok = 0;
let skipped = 0;

for (const file of htmlFiles) {
  try {
    const raw = readFileSync(file, "utf-8");
    const normalised = makeHrefsAbsolute(raw, dirname(file));
    const processed = await critters.process(normalised);
    writeFileSync(file, processed);
    ok++;
  } catch (err) {
    console.warn(
      `[critters] Warning: skipped ${relative(buildDir, file)}: ${err.message}`
    );
    skipped++;
  }
}

console.log(
  `[critters] Done — ${ok} pages inlined${skipped ? `, ${skipped} skipped` : ""}.`
);
