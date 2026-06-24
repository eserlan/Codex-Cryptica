import type { Entity } from "schema";

const DEFAULT_MAX_LENGTH = 140;

/**
 * Build a short, plain-text summary snippet for a table row from an entity's
 * body. Prefers `content`, falling back to `lore`. Markdown is stripped so the
 * snippet reads cleanly in a single cell. Returns "" when there is no body —
 * the table renders that as an em dash so gaps stay visible.
 */
export function entitySnippet(
  entity: Pick<Entity, "content" | "lore">,
  maxLength: number = DEFAULT_MAX_LENGTH,
): string {
  const raw = entity.content?.trim() || entity.lore?.trim() || "";
  if (!raw) return "";

  const plain = stripMarkdown(raw);
  if (!plain) return "";
  if (plain.length <= maxLength) return plain;

  return `${plain.slice(0, maxLength).trimEnd()}…`;
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // fenced code blocks
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> link text
    .replace(/^\s{0,3}#{1,6}\s+/gm, "") // headings
    .replace(/^\s{0,3}>\s?/gm, "") // blockquotes
    .replace(/[*_~]/g, "") // emphasis markers
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}
