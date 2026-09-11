import { load as yamlLoad } from "js-yaml";

const FRONTMATTER_REGEX = /^\s*---\r?\n([\s\S]*?)\r?\n---\s*/;
const ENTITY_EXTENSION_REGEX = /\.(md|markdown)$/i;

/**
 * Cheap extension-only check, meant to short-circuit *before* reading a
 * dropped item's content — e.g. so a batch conversion can skip decoding
 * binary files (images) as text just to discard them.
 */
export function hasEntityFileExtension(relativePath: string): boolean {
  return ENTITY_EXTENSION_REGEX.test(relativePath);
}

export interface ParsedVaultFile {
  metadata: Record<string, unknown>;
  content: string;
}

/**
 * Splits a Codex Cryptica entity markdown file into its YAML frontmatter and
 * body, mirroring apps/web's parseMarkdown convention (frontmatter must
 * parse to a plain mapping — arrays/scalars/degenerate mappings are
 * rejected rather than silently accepted as metadata).
 */
export function parseVaultFileFrontmatter(raw: string): ParsedVaultFile {
  const match = raw.match(FRONTMATTER_REGEX);
  if (!match) {
    return { metadata: {}, content: raw };
  }

  let metadata: Record<string, unknown> = {};
  try {
    const parsed = yamlLoad(match[1]) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      parsed.constructor === Object &&
      !("null" in parsed)
    ) {
      metadata = parsed as Record<string, unknown>;
    }
  } catch {
    // Malformed YAML: treat as no metadata, same as apps/web's parseMarkdown.
  }

  const content = raw.slice((match.index ?? 0) + match[0].length).trim();
  return { metadata, content };
}

/**
 * Recognizes a dropped file as existing Codex Cryptica entity content: a
 * markdown file with frontmatter that parses to a plain mapping carrying at
 * least a non-empty `type` and `title` (the two fields EntitySchema
 * requires). Deliberately lenient beyond that — this only needs to route
 * real vault files into the import package, not fully validate them.
 */
export function isVaultEntityFile(
  relativePath: string,
  content: string,
): boolean {
  if (!hasEntityFileExtension(relativePath)) return false;

  const { metadata } = parseVaultFileFrontmatter(content);
  return (
    typeof metadata.type === "string" &&
    metadata.type.trim().length > 0 &&
    typeof metadata.title === "string" &&
    metadata.title.trim().length > 0
  );
}
