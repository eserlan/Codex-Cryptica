import yaml from "js-yaml";
import type { Entity } from "schema";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

export interface ParseResult {
  metadata: Partial<Entity>;
  content: string;
}

export function renderMarkdown(
  text: string,
  options: { query?: string; inline?: boolean } = {},
): string {
  if (!text) return "";

  let content = text;
  if (options.query) {
    const safeQuery = options.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${safeQuery})`, "gi");
    content = text.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-900/50 text-inherit rounded-sm px-0.5">$1</mark>',
    );
  }

  const rawHtml = options.inline
    ? (marked.parseInline(content) as string)
    : (marked.parse(content) as string);

  return DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ["mark"],
    ADD_ATTR: ["class"],
  });
}

export function parseMarkdown(raw: string): ParseResult {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = raw.match(frontmatterRegex);

  let metadata: Partial<Entity> = {};
  let content = raw;

  if (match) {
    try {
      const yamlContent = match[1];
      const parsed = yaml.load(yamlContent) as any;
      if (typeof parsed === "object" && parsed !== null) {
        metadata = parsed;
      }
    } catch (e) {
      console.error("Failed to parse frontmatter", e);
    }
    content = raw.replace(frontmatterRegex, "").trim();
  }

  return { metadata, content };
}

export function sanitizeId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function stringifyEntity(entity: Entity): string {
  const { content, updatedAt, ...metadata } = entity;

  // Ensure updatedAt is the FIRST property for optimized sync scanning
  const orderedMetadata: any = { updatedAt };

  // Remove runtime-only fields if they crept in
  const cleanRest = { ...metadata };
  delete (cleanRest as any)._fsHandle;
  delete (cleanRest as any)._lastModified;
  delete (cleanRest as any).connections;

  Object.assign(orderedMetadata, cleanRest);
  orderedMetadata.connections = entity.connections;

  // Use sortKeys: false to preserve our specific order
  const yamlStr = yaml.dump(orderedMetadata, { sortKeys: false });
  return `---\n${yamlStr}---\n${content || ""}`;
}

/**
 * Derives a unique entity ID from a file path.
 */
export function deriveIdFromPath(path: string[]): string {
  const filename = path[path.length - 1];
  return filename.replace(/\.(md|markdown)$/i, "");
}
