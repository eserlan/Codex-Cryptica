/**
 * Post-build script: inline critical CSS into prerendered HTML pages.
 *
 * Critters identifies which CSS rules are needed to render above-the-fold
 * content, inlines them as <style> in <head>, and converts the original
 * <link rel="stylesheet"> to load asynchronously — eliminating the
 * render-blocking penalty.
 *
 * Runs on all prerendered pages. 404.html is skipped since it is a
 * post-build copy of the already-processed index.html.
 */

import Critters from "critters";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, join, relative, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = resolve(__dirname, "../build");

// 404.html is a post-processed copy of index.html (see build script) — skip it
// to avoid double-processing. index.html IS prerendered and benefits from critters.
const SKIP = new Set(["404.html"]);

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
// Normalise them to absolute paths — the output stays absolute, which
// is fine since the site deploys at root `/`.
function makeHrefsAbsolute(html, fileDir) {
  return html.replace(
    /(<link\b[^>]+\bhref=")([^"]+\.css)("[^>]*>)/g,
    (match, pre, href, post) => {
      if (href.startsWith("/") || href.startsWith("http")) return match;
      // Use forward slashes explicitly to handle Windows path separators.
      const abs = "/" + relative(buildDir, resolve(fileDir, href)).replace(/\\/g, "/");
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
      `[critters] Warning: skipped ${relative(buildDir, file)}: ${err instanceof Error ? err.message : String(err)}`
    );
    skipped++;
  }
}

console.log(
  `[critters] Done — ${ok} pages inlined${skipped ? `, ${skipped} skipped` : ""}.`
);
