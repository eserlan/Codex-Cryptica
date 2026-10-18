/**
 * Generates and caches dense vector embeddings for help assistant chunks.
 *
 *   bun scripts/sync-help-embeddings.ts
 *
 * Uses Cloudflare Workers AI (@cf/baai/bge-small-en-v1.5, 384 dimensions) to
 * compute embeddings for every chunk in the help knowledge bundle.
 * Results are stored in packages/help-engine/src/bundle/embeddings.generated.json,
 * keyed by chunk ID and content hash so unchanged chunks are never re-embedded.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_REGISTRY } from "../packages/help-engine/src/registry";
import { buildBundle } from "../packages/help-engine/src/bundle/build";
import { parseHelpArticle } from "../packages/help-engine/src/bundle/front-matter";
import {
  embeddingFingerprint,
  embeddingText,
  isValidEmbeddingVector,
  validateEmbeddingBatch,
  HELP_EMBEDDING_MODEL,
} from "../packages/help-engine/src/bundle/embeddings";
import type { HelpArticleSource } from "../packages/help-engine/src/bundle/types";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const helpDir = path.join(root, "apps/web/src/lib/content/help");
const outputPath = path.join(
  root,
  "packages/help-engine/src/bundle/embeddings.generated.json",
);

const BATCH_SIZE = 50;

// fallow-ignore-next-line complexity
export function getWranglerAuth(): { token: string; accountId: string } | null {
  if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
    return {
      token: process.env.CLOUDFLARE_API_TOKEN,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    };
  }

  const homedir = process.env.HOME || process.env.USERPROFILE || "";
  const configPath = path.join(
    homedir,
    ".config/.wrangler/config/default.toml",
  );
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, "utf8");
      const tokenMatch = content.match(/oauth_token\s*=\s*"([^"]+)"/);
      if (tokenMatch) {
        return {
          token: tokenMatch[1],
          accountId:
            process.env.CLOUDFLARE_ACCOUNT_ID ||
            "b065cbccc9617f440b47177d96ac15d8",
        };
      }
    } catch {
      // Ignore reading failure
    }
  }

  return null;
}

// fallow-ignore-next-line complexity
export async function requestEmbeddings(
  texts: string[],
  auth: { token: string; accountId: string },
  fetcher: typeof fetch = fetch,
): Promise<number[][]> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${auth.accountId}/ai/run/${HELP_EMBEDDING_MODEL}`;
  const response = await fetcher(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: texts }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(
      `Cloudflare Workers AI embedding failed (${response.status}).`,
    );
  }

  const result = (await response.json()) as {
    success: boolean;
    result?: { data?: number[][] };
    errors?: unknown[];
  };

  if (!result.success || !result.result?.data) {
    throw new Error("Workers AI returned an unsuccessful embedding response.");
  }

  return validateEmbeddingBatch(result.result.data, texts.length);
}

// fallow-ignore-next-line complexity
async function main() {
  console.log("Loading help articles and features...");
  const files = fs
    .readdirSync(helpDir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  const articles: HelpArticleSource[] = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(helpDir, file), "utf8");
    const article = parseHelpArticle(raw);
    if (article) articles.push(article);
  }

  const bundle = buildBundle({
    features: FEATURE_REGISTRY,
    articles,
    commit: "local",
    builtAt: new Date().toISOString(),
    channel: "production",
  });

  console.log(
    `Loaded ${bundle.chunks.length} chunks across ${articles.length} articles.`,
  );

  // Load existing embeddings cache if available
  let existingMap: Record<string, { hash: string; vector: number[] }> = {};
  if (fs.existsSync(outputPath)) {
    try {
      existingMap = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    } catch {
      existingMap = {};
    }
  }

  const toEmbed: { id: string; hash: string; text: string }[] = [];
  const finalMap: Record<string, { hash: string; vector: number[] }> = {};

  for (const chunk of bundle.chunks) {
    const cached = existingMap[chunk.id];
    const hash = embeddingFingerprint(chunk);
    if (
      cached &&
      cached.hash === hash &&
      isValidEmbeddingVector(cached.vector)
    ) {
      finalMap[chunk.id] = { hash, vector: cached.vector };
    } else {
      toEmbed.push({
        id: chunk.id,
        hash,
        text: embeddingText(chunk),
      });
    }
  }

  console.log(
    `Cached embeddings reused: ${Object.keys(finalMap).length}. Chunks to embed: ${toEmbed.length}.`,
  );

  if (toEmbed.length > 0) {
    const auth = getWranglerAuth();
    if (!auth) {
      console.error(
        "Error: No Cloudflare credentials found. Please log in via `wrangler login` or set CLOUDFLARE_API_TOKEN.",
      );
      process.exit(1);
    }

    for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
      const batch = toEmbed.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(toEmbed.length / BATCH_SIZE);
      console.log(
        `Embedding batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`,
      );

      const texts = batch.map((item) => item.text);
      const vectors = await requestEmbeddings(texts, auth);

      // Validate the entire response before changing finalMap so a partial
      // batch can never produce a partially updated artifact.
      validateEmbeddingBatch(vectors, batch.length);
      for (let j = 0; j < batch.length; j++) {
        // Round floats to 4 decimal places to reduce file size while keeping high precision
        const rounded = vectors[j].map((v) => Math.round(v * 10000) / 10000);
        finalMap[batch[j].id] = {
          hash: batch[j].hash,
          vector: rounded,
        };
      }
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(finalMap));
  const stats = fs.statSync(outputPath);
  console.log(
    `Successfully written ${Object.keys(finalMap).length} embeddings to ${path.relative(root, outputPath)} (${Math.round(stats.size / 1024)} KB)`,
  );
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
