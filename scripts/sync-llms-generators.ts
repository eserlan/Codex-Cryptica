/**
 * Regenerate the machine-maintained generator section in
 * `apps/web/static/llms.txt` from the canonical discovery registry (#3163).
 *
 *   bun scripts/sync-llms-generators.ts          # rewrite the section
 *   bun scripts/sync-llms-generators.ts --check  # exit 1 when stale (CI)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderLlmsGeneratorLines } from "../apps/web/src/lib/seo/llms-generators";
import {
  LLMS_GENERATORS_END,
  LLMS_GENERATORS_START,
  extractMarkedSection,
  replaceMarkedSection,
} from "../apps/web/src/lib/seo/llms-section-markers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const llmsTxtPath = path.resolve(__dirname, "../apps/web/static/llms.txt");

const checkOnly = process.argv.includes("--check");
const current = fs.readFileSync(llmsTxtPath, "utf8");
const section = extractMarkedSection(
  current,
  LLMS_GENERATORS_START,
  LLMS_GENERATORS_END,
);
if (section === null) {
  throw new Error(
    `[llms-generators] Markers missing in ${llmsTxtPath}; run without --check after restoring them.`,
  );
}

const wanted = renderLlmsGeneratorLines().join("\n");
if (section.trim() === wanted.trim()) {
  console.log("[llms-generators] llms.txt generator section is in sync.");
  process.exit(0);
}

if (checkOnly) {
  console.error(
    "[llms-generators] llms.txt generator section is stale; run `bun sync:llms-generators`.",
  );
  process.exit(1);
}

fs.writeFileSync(
  llmsTxtPath,
  replaceMarkedSection(
    current,
    LLMS_GENERATORS_START,
    LLMS_GENERATORS_END,
    renderLlmsGeneratorLines(),
  ),
);
console.log("[llms-generators] llms.txt generator section regenerated.");
