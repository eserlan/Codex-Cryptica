/**
 * Capture an Open Graph card image for a public generator page.
 *
 * The generator pages seed an example draft on mount, so a plain visit to the
 * live page already shows a filled-in result — no API key or local vault state
 * is needed. We shoot the live site rather than a dev server so the card always
 * matches what a visitor following the link will actually land on.
 *
 * Usage:
 *   node scripts/og-images/capture-generator-og.mjs alien-race
 *   node scripts/og-images/capture-generator-og.mjs alien-race --base http://localhost:5173
 *
 * Output: blogPics/og/generator-<slug>.jpg (1600x1000, the dimensions the
 * og:image meta tags declare). Upload to R2 under screenshots/ — see
 * docs/deployment/assets.md.
 */
import { chromium } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const WIDTH = 1600;
const HEIGHT = 1000;

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const args = process.argv.slice(2);
const slug = args.find((arg) => !arg.startsWith("--"));
if (!slug) {
  console.error(
    "Usage: node scripts/og-images/capture-generator-og.mjs <slug> [--base <url>]",
  );
  process.exit(1);
}
const baseIndex = args.indexOf("--base");
let base = "https://codexcryptica.com";
if (baseIndex !== -1) {
  const customBase = args[baseIndex + 1];
  if (!customBase || customBase.startsWith("--")) {
    console.error("Error: --base requires a URL argument");
    process.exit(1);
  }
  base = customBase.replace(/\/+$/, "");
}

const outputDir = path.join(repoRoot, "blogPics/og");
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, `generator-${slug}.jpg`);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });

  await page.goto(`${base}/generators/${slug}`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  // The seeded example draft renders a beat after hydration.
  await page.waitForTimeout(3000);

  // Shot from the top of the page, deliberately: scrolling past the site header
  // only half-hides it (the nav is sticky) and clips the panels mid-card, while
  // at rest the frame reads as generator title, inputs, and the example result.
  await page.screenshot({ path: outputPath, type: "jpeg", quality: 88 });
  console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
} finally {
  await browser.close();
}
