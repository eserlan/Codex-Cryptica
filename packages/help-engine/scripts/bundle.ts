/**
 * Builds the contextual-help knowledge bundle.
 *
 *   bun scripts/bundle.ts [--help-dir <dir>] [--out <file>] [--channel production|staging]
 *
 * The help directory defaults to the web app's in-app help articles. The
 * bundle is generated at build time and never committed.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_REGISTRY } from "../src/registry";
import { buildBundle } from "../src/bundle/build";
import {
  parseHelpArticle,
  validateHelpCorpus,
  type HelpCorpusSource,
} from "../src/bundle/front-matter";
import type { HelpArticleSource } from "../src/bundle/types";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const helpDir = resolve(
  arg("help-dir") ?? join(packageRoot, "../../apps/web/src/lib/content/help"),
);
const out = resolve(
  arg("out") ?? join(packageRoot, "dist/knowledge-bundle.json"),
);
const channel = arg("channel") === "staging" ? "staging" : "production";

const sources: HelpCorpusSource[] = readdirSync(helpDir)
  .filter((file: string) => file.endsWith(".md"))
  .sort()
  .map((file) => ({
    source: file,
    raw: readFileSync(join(helpDir, file), "utf8"),
  }));

const metadataErrors = validateHelpCorpus(sources);
if (metadataErrors.length > 0) {
  throw new Error(`Invalid Help corpus:\n${metadataErrors.join("\n")}`);
}

const articles: HelpArticleSource[] = [];
for (const { raw } of sources) {
  const article = parseHelpArticle(raw);
  if (article) articles.push(article);
}

const embeddingsPath = join(
  packageRoot,
  "src/bundle/embeddings.generated.json",
);
let embeddings: Record<string, { hash: string; vector: number[] }> | undefined;
try {
  embeddings = JSON.parse(readFileSync(embeddingsPath, "utf8"));
} catch {
  // Gracefully continue without embeddings if not yet generated
}

const bundle = buildBundle({
  features: FEATURE_REGISTRY,
  articles,
  commit: process.env.GITHUB_SHA ?? "local",
  builtAt: new Date().toISOString(),
  channel,
  embeddings,
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(bundle));
console.log(
  `help bundle: ${bundle.chunks.length} chunks, ${bundle.features.length} features, ${bundle.helpIds.length} articles -> ${out}`,
);
