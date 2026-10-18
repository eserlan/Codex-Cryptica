import type { HelpChunk } from "./types";

/** Roughly four characters per token; used only to bound chunk size. */
export const MAX_CHUNK_TOKENS = 450;
const MAX_CHUNK_CHARS = MAX_CHUNK_TOKENS * 4;

export const estimateTokens = (text: string): number =>
  Math.ceil(text.length / 4);

/** Small, synchronous, stable content hash (FNV-1a, 32-bit, hex). */
export function contentHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export const normaliseText = (text: string): string =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

interface Section {
  heading: string;
  body: string;
}

function splitSections(markdown: string): Section[] {
  const sections: Section[] = [];
  let heading = "";
  let buffer: string[] = [];
  const flush = () => {
    const body = normaliseText(buffer.join("\n"));
    if (body) sections.push({ heading, body });
    buffer = [];
  };
  for (const line of normaliseText(markdown).split("\n")) {
    const match = /^#{1,3}\s+(.*)$/.exec(line);
    if (match && /^##\s/.test(line)) {
      flush();
      heading = match[1].trim();
    } else if (match && !heading) {
      // A leading "# Title" is the article title, not a section heading.
      continue;
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

/** Splits oversized text on paragraph breaks, then on sentences as a last resort. */
function fit(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];
  const parts: string[] = [];
  let current = "";
  const units = text
    .split(/\n\n+/)
    .flatMap((p) =>
      p.length <= MAX_CHUNK_CHARS ? [p] : p.split(/(?<=[.!?])\s+/),
    );
  for (const unit of units) {
    if (current && current.length + unit.length + 2 > MAX_CHUNK_CHARS) {
      parts.push(current);
      current = "";
    }
    current = current ? `${current}\n\n${unit}` : unit;
  }
  if (current) parts.push(current);
  return parts.flatMap((part) =>
    part.length <= MAX_CHUNK_CHARS
      ? [part]
      : (part.match(new RegExp(`.{1,${MAX_CHUNK_CHARS}}`, "gs")) ?? [part]),
  );
}

export interface ChunkOptions {
  sourceId: string;
  title: string;
  markdown: string;
  kind: "help" | "registry";
  featureId: string | null;
  helpId: string | null;
}

/**
 * Splits markdown on `##` headings into chunks of at most ~450 tokens. The
 * heading is kept on each chunk, and IDs are stable for the same content.
 */
export function chunkMarkdown(options: ChunkOptions): HelpChunk[] {
  const chunks: HelpChunk[] = [];
  for (const section of splitSections(options.markdown)) {
    for (const text of fit(section.body)) {
      const index = chunks.length;
      chunks.push({
        id: `${options.sourceId}#${index}`,
        sourceId: options.sourceId,
        kind: options.kind,
        featureId: options.featureId,
        helpId: options.helpId,
        title: options.title,
        heading: section.heading,
        text,
        hash: contentHash(`${section.heading}\n${text}`),
      });
    }
  }
  return chunks;
}
