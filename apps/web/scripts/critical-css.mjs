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

import { isMainThread, parentPort, workerData, Worker } from "worker_threads";
import Critters from "critters";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, join, relative, dirname } from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = resolve(__dirname, "../build");

// 404.html is a post-processed copy of index.html (see build script) — skip it
// to avoid double-processing. index.html IS prerendered and benefits from critters.
const SKIP = new Set(["404.html"]);

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

async function processFiles(files) {
  const critters = new Critters({
    path: buildDir,
    publicPath: "/",
    // 'media' trick: <link media="print" onload="this.media='all'">
    preload: "media",
    pruneSource: false,
    fonts: false,
    logLevel: "warn",
  });

  let ok = 0;
  let skipped = 0;
  const warnings = [];

  for (const file of files) {
    try {
      const raw = readFileSync(file, "utf-8");
      const normalised = makeHrefsAbsolute(raw, dirname(file));
      const processed = await critters.process(normalised);
      writeFileSync(file, processed);
      ok++;
    } catch (err) {
      warnings.push(
        `Warning: skipped ${relative(buildDir, file)}: ${err instanceof Error ? err.message : String(err)}`
      );
      skipped++;
    }
  }

  return { ok, skipped, warnings };
}

if (!isMainThread) {
  const { files } = workerData;
  const result = await processFiles(files);
  parentPort.postMessage(result);
} else {
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

  const htmlFiles = findHtmlFiles(buildDir);
  const numWorkers = Math.min(
    htmlFiles.length,
    Math.max(1, os.availableParallelism ? os.availableParallelism() : os.cpus().length)
  );

  console.log(
    `[critters] Processing ${htmlFiles.length} prerendered pages across ${numWorkers} worker threads…`
  );

  let totalOk = 0;
  let totalSkipped = 0;

  if (numWorkers <= 1) {
    const res = await processFiles(htmlFiles);
    totalOk = res.ok;
    totalSkipped = res.skipped;
    for (const w of res.warnings) console.warn(`[critters] ${w}`);
  } else {
    const chunks = Array.from({ length: numWorkers }, () => []);
    htmlFiles.forEach((file, i) => chunks[i % numWorkers].push(file));

    const promises = chunks
      .filter((chunk) => chunk.length > 0)
      .map((chunk) => {
        return new Promise((resolveWorker, rejectWorker) => {
          const worker = new Worker(new URL(import.meta.url), {
            workerData: { files: chunk },
          });
          worker.on("message", resolveWorker);
          worker.on("error", rejectWorker);
          worker.on("exit", (code) => {
            if (code !== 0) {
              rejectWorker(new Error(`Worker stopped with exit code ${code}`));
            }
          });
        });
      });

    const results = await Promise.all(promises);
    for (const res of results) {
      totalOk += res.ok;
      totalSkipped += res.skipped;
      for (const w of res.warnings) console.warn(`[critters] ${w}`);
    }
  }

  console.log(
    `[critters] Done — ${totalOk} pages inlined${totalSkipped ? `, ${totalSkipped} skipped` : ""}.`
  );
}
