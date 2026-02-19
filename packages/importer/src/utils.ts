import TurndownService from "turndown";

export function htmlToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  return turndownService.turndown(html);
}

import type { DiscoveredEntity } from "./types";

/**
 * Merges a list of discovered entities by title, deduplicating them and combining their lore/chronicle.
 */
export function mergeEntities(
  entities: DiscoveredEntity[],
): DiscoveredEntity[] {
  const map = new Map<string, DiscoveredEntity>();

  for (const entity of entities) {
    const key = entity.suggestedTitle.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, { ...entity });
    } else {
      const existing = map.get(key)!;
      // Merge Content
      if (entity.chronicle) {
        existing.chronicle = [existing.chronicle, entity.chronicle]
          .filter(Boolean)
          .join("\n\n");
      }
      if (entity.lore) {
        existing.lore = [existing.lore, entity.lore]
          .filter(Boolean)
          .join("\n\n");
      }
      if (entity.content) {
        existing.content = [existing.content, entity.content]
          .filter(Boolean)
          .join("\n\n");
      }
      // Merge Image
      existing.frontmatter.image =
        existing.frontmatter.image || entity.frontmatter.image;
      // Merge Links
      const existingLinks = new Map<string, any>();
      [...existing.detectedLinks, ...entity.detectedLinks].forEach((link) => {
        const l = typeof link === "string" ? { target: link } : link;
        const targetKey = l.target.toLowerCase().trim();
        if (
          !existingLinks.has(targetKey) ||
          (!existingLinks.get(targetKey).label && l.label)
        ) {
          existingLinks.set(targetKey, l);
        }
      });
      existing.detectedLinks = Array.from(existingLinks.values());
    }
  }

  return Array.from(map.values());
}

/**
 * Generates a SHA-256 hash for a file blob to uniquely identify content.
 */
export async function calculateFileHash(file: Blob): Promise<string> {
  let data: ArrayBuffer | Uint8Array;

  if (typeof file.arrayBuffer === "function") {
    try {
      data = new Uint8Array(await file.arrayBuffer());
    } catch {
      // Fallback for some JSDOM/Node environments
      const text = await file.text();
      data = new TextEncoder().encode(text);
    }
  } else {
    // Fallback for environments without arrayBuffer
    data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    data as BufferSource,
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

/**
 * Splits a large text into manageable chunks for AI analysis, with overlap for context continuity.
 */
export function splitTextIntoChunks(
  text: string,
  chunkSize = 50000,
  overlap = 2000,
): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;
  const safeOverlap = Math.min(overlap, chunkSize - 1);

  while (start < text.length) {
    let end = start + chunkSize;
    if (end < text.length) {
      // Try to find a paragraph break to split cleanly, falling back to a space
      const minSplit = start + chunkSize / 2;
      let splitPos = -1;

      const lastNewline = text.lastIndexOf("\n", end);
      if (lastNewline >= minSplit) {
        splitPos = lastNewline;
      } else {
        const lastSpace = text.lastIndexOf(" ", end);
        if (lastSpace >= minSplit) {
          splitPos = lastSpace;
        }
      }

      if (splitPos !== -1) {
        end = splitPos;
      }
    }
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - safeOverlap;
  }
  return chunks;
}
