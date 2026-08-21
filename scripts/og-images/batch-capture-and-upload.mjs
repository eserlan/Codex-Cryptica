/**
 * Batch capture and upload Open Graph card images for all public generators.
 *
 * Captures 1600x1000 screenshots with Playwright, saves them to `blogPics/og/generator-<slug>.jpg`,
 * and uploads them to the Cloudflare R2 bucket `codex-cryptica-statics/screenshots/`.
 *
 * Usage:
 *   node scripts/og-images/batch-capture-and-upload.mjs
 *   node scripts/og-images/batch-capture-and-upload.mjs --base http://localhost:5173
 *   node scripts/og-images/batch-capture-and-upload.mjs --skip-upload
 */

import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const WIDTH = 1600;
const HEIGHT = 1000;
const BUCKET = "codex-cryptica-statics";

const ALL_SLUGS = [
  "npc",
  "settlement",
  "magic-item",
  "minor-magic-item",
  "faction",
  "quest",
  "item",
  "tavern",
  "social-hub",
  "kingdom",
  "nation",
  "vampire-clan",
  "nomad-clan",
  "names",
  "fantasy-names",
  "dnd-npc",
  "pantheon-generator",
  "god-generator",
  "ship-generator",
  "language-generator",
  "news-sheet-generator",
  "dungeon-generator",
  "adventure-generator",
  "adventure-idea-generator",
  "plot-twist-generator",
  "bbeg-generator",
  "world",
  "council-vote",
  "secret-society",
  "star-system",
  "alien-race",
];

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const args = process.argv.slice(2);
const skipUpload = args.includes("--skip-upload");
const baseIndex = args.indexOf("--base");
let baseUrl = "https://codexcryptica.com";
if (baseIndex !== -1) {
  const customBase = args[baseIndex + 1];
  if (customBase && !customBase.startsWith("--")) {
    baseUrl = customBase.replace(/\/+$/, "");
  }
}

const outputDir = path.join(repoRoot, "blogPics/og");
fs.mkdirSync(outputDir, { recursive: true });

console.log(
  `Starting OG capture for ${ALL_SLUGS.length} generators using baseUrl: ${baseUrl}`,
);

const failedSlugs = [];
const browser = await chromium.launch();

try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    colorScheme: "dark",
  });

  for (let i = 0; i < ALL_SLUGS.length; i++) {
    const slug = ALL_SLUGS[i];
    const outputPath = path.join(outputDir, `generator-${slug}.jpg`);
    const targetUrl = `${baseUrl}/generators/${slug}`;

    console.log(
      `[${i + 1}/${ALL_SLUGS.length}] Capturing ${slug} from ${targetUrl}...`,
    );

    try {
      await page.goto(targetUrl, {
        waitUntil: "networkidle",
        timeout: 45_000,
      });

      // Wait a moment for dynamic sample output hydration
      await page.waitForTimeout(2500);

      await page.screenshot({ path: outputPath, type: "jpeg", quality: 88 });
      console.log(`  Saved to ${path.relative(repoRoot, outputPath)}`);

      if (!skipUpload) {
        const remoteKey = `screenshots/generator-${slug}.jpg`;
        console.log(`  Uploading to R2 (${BUCKET}/${remoteKey})...`);
        execFileSync(
          "bunx",
          [
            "wrangler",
            "r2",
            "object",
            "put",
            `${BUCKET}/${remoteKey}`,
            `--file=${outputPath}`,
            "--content-type=image/jpeg",
            "--remote",
          ],
          { stdio: "inherit" },
        );
        console.log(`  Uploaded ${remoteKey}`);
      }
    } catch (err) {
      console.error(`  Error processing ${slug}:`, err);
      failedSlugs.push(slug);
    }
  }
} finally {
  await browser.close();
}

if (failedSlugs.length > 0) {
  console.error(
    `\nFinished with ${failedSlugs.length} error(s). Failed slugs: ${failedSlugs.join(", ")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `\nAll done! Successfully captured and processed all ${ALL_SLUGS.length} generators.`,
  );
}

