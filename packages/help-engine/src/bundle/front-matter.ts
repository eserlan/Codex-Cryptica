import type { HelpArticleSource } from "./types";

interface FrontMatterBlock {
  front: string;
  content: string;
}

export interface HelpCorpusSource {
  source: string;
  raw: string;
}

const HELP_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function splitFrontMatter(raw: string): FrontMatterBlock | null {
  const match = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*)$/.exec(raw);
  if (!match) return null;
  return { front: match[1], content: match[2] };
}

function scalar(front: string, key: string): string | null {
  const hit = new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m").exec(front);
  return hit ? hit[1].replace(/^["']|["']$/g, "").trim() : null;
}

function list(front: string, key: string): string[] | null {
  const raw = scalar(front, key);
  if (!raw) return null;
  if (!raw.startsWith("[") || !raw.endsWith("]")) return null;
  return raw
    .slice(1, -1)
    .split(",")
    .map((value) => value.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function visibleMetadata(raw: string): {
  id: string | null;
  title: string | null;
  description: string | null;
  tags: string[] | null;
  rank: string | null;
} | null {
  const block = splitFrontMatter(raw);
  if (!block) return null;
  if (scalar(block.front, "hidden") === "true") return null;
  return {
    id: scalar(block.front, "id"),
    title: scalar(block.front, "title"),
    description: scalar(block.front, "description"),
    tags: list(block.front, "tags"),
    rank: scalar(block.front, "rank"),
  };
}

/**
 * Validates the front-matter contract shared by human Help and AI Help.
 * Hidden articles are deliberately excluded: they are not user-facing and are
 * not included in the contextual-help knowledge bundle.
 */
export function validateHelpArticleFrontMatter(raw: string): string[] {
  const block = splitFrontMatter(raw);
  if (!block) return ["missing front matter"];
  if (scalar(block.front, "hidden") === "true") return [];

  const metadata = visibleMetadata(raw);
  if (!metadata) return ["could not read visible article metadata"];

  const errors: string[] = [];
  if (!metadata.id) errors.push("missing required `id`");
  else if (!HELP_ID.test(metadata.id))
    errors.push("`id` must be stable kebab-case");

  if (!metadata.title) errors.push("missing required `title`");
  if (!metadata.description)
    errors.push("missing required `description`");
  else if (metadata.description.length > 240)
    errors.push("`description` must be concise (240 characters or fewer)");

  if (!metadata.tags?.length) errors.push("missing non-empty `tags` array");

  if (metadata.rank !== null) {
    const rank = Number(metadata.rank);
    if (!Number.isInteger(rank) || rank < 0)
      errors.push("`rank` must be a non-negative integer when present");
  }
  return errors;
}

/**
 * Validates every Help file together, including duplicate IDs. Errors include
 * the source path so CI points directly at the article that needs attention.
 */
export function validateHelpCorpus(sources: readonly HelpCorpusSource[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();

  for (const { source, raw } of sources) {
    for (const error of validateHelpArticleFrontMatter(raw)) {
      errors.push(`${source}: ${error}`);
    }

    const metadata = visibleMetadata(raw);
    const id = metadata?.id;
    if (!id) continue;
    const previous = seen.get(id);
    if (previous) errors.push(`${source}: duplicate id "${id}" (also in ${previous})`);
    else seen.set(id, source);
  }
  return errors;
}

/**
 * Minimal front-matter reader for the knowledge bundle. Validation of the full
 * user-facing metadata contract is handled by `validateHelpCorpus` before the
 * bundle is built; this reader only extracts fields needed by chunking.
 */
export function parseHelpArticle(raw: string): HelpArticleSource | null {
  const block = splitFrontMatter(raw);
  if (!block) return null;
  if (scalar(block.front, "hidden") === "true") return null;
  const id = scalar(block.front, "id");
  const title = scalar(block.front, "title");
  if (!id || !title) return null;
  return { id, title, content: block.content };
}
