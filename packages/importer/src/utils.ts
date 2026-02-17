import TurndownService from "turndown";

export function htmlToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
  });
  return turndownService.turndown(html);
}

/**
 * Generates a SHA-256 hash for a file blob to uniquely identify content.
 */
export async function calculateFileHash(file: Blob): Promise<string> {
  let data: ArrayBuffer | Uint8Array;

  if (typeof file.arrayBuffer === "function") {
    try {
      data = await file.arrayBuffer();
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

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
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
      // Try to find a paragraph break to split cleanly
      const lastNewline = text.lastIndexOf("\n", end);
      if (lastNewline > start + chunkSize / 2) {
        end = lastNewline;
      }
    }
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - safeOverlap;
  }
  return chunks;
}
