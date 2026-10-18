import { contentHash } from "./chunk";
import type { HelpChunk } from "./types";

export const HELP_EMBEDDING_MODEL = "@cf/baai/bge-small-en-v1.5";
export const HELP_EMBEDDING_DIMENSIONS = 384;

export function embeddingText(
  chunk: Pick<HelpChunk, "title" | "heading" | "text">,
): string {
  return `${chunk.title}: ${chunk.heading ? `${chunk.heading} - ` : ""}${chunk.text}`;
}

export function embeddingFingerprint(
  chunk: Pick<HelpChunk, "title" | "heading" | "text">,
  model = HELP_EMBEDDING_MODEL,
): string {
  return contentHash(`${model}\n${embeddingText(chunk)}`);
}

export function isValidEmbeddingVector(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length !== HELP_EMBEDDING_DIMENSIONS) {
    return false;
  }
  for (let index = 0; index < value.length; index++) {
    if (typeof value[index] !== "number" || !Number.isFinite(value[index])) {
      return false;
    }
  }
  return true;
}

export function validateEmbeddingBatch(
  value: unknown,
  expectedCount: number,
): number[][] {
  if (!Array.isArray(value) || value.length !== expectedCount) {
    throw new Error(
      `Workers AI returned invalid embeddings: expected ${expectedCount} vectors of ${HELP_EMBEDDING_DIMENSIONS} finite numbers.`,
    );
  }
  for (let index = 0; index < value.length; index++) {
    if (!isValidEmbeddingVector(value[index])) {
      throw new Error(
        `Workers AI returned invalid embeddings: expected ${expectedCount} vectors of ${HELP_EMBEDDING_DIMENSIONS} finite numbers.`,
      );
    }
  }
  return value;
}
