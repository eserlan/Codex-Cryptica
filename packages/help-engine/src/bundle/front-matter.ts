import { load as loadYaml } from "js-yaml";
import type { HelpArticleSource } from "./types";

interface FrontMatterBlock {
  front: string;
  content: string;
}

interface ParsedFrontMatter extends FrontMatterBlock {
  metadata: Record<string, unknown>;
}

export interface HelpCorpusSource {
  source: string;
  raw: string;
}

const HELP_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FRONT_MATTER =
  /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/;

function splitFrontMatter(raw: string): FrontMatterBlock | null {
  const match = FRONT_MATTER.exec(raw);
  if (!match) return null;
  return { front: match[1], content: match[2] };
}

function parseFrontMatter(
  raw: string,
): { value: ParsedFrontMatter | null; error: string | null } {
  const block = splitFrontMatter(raw);
  if (!block) return { value: null, error: "missing front matter" };

  try {
    const parsed = loadYaml(block.front);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return {
        value: null,
        error: "front matter must be a YAML mapping",
      };
    }
    return {
      value: {
        ...block,
        metadata: parsed as Record<string, unknown>,
      },
      error: null,
    };
  } catch {
    return { value: null, error: "malformed YAML front matter" };
  }
}

function stringField(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validateId(metadata: Record<string, unknown>): string[] {
  const id = stringField(metadata, "id");
  if (!id) return ["missing required string `id`"];
  if (!HELP_ID.test(id)) return ["`id` must be stable kebab-case"];
  return [];
}

/**
 * Validates the front-matter contract shared by human Help and AI Help.
 * Hidden articles still require a stable ID so duplicate detection matches the
 * human Help loader; other user-facing fields are required only for visible
 * articles. Only the YAML boolean `hidden: true` hides an article.
 */
export function validateHelpArticleFrontMatter(raw: string): string[] {
  const parsed = parseFrontMatter(raw);
  if (!parsed.value) return [parsed.error ?? "could not parse front matter"];

  const { metadata } = parsed.value;
  const errors = validateId(metadata);
  if (metadata.hidden === true) return errors;

  if (!stringField(metadata, "title"))
    errors.push("missing required string `title`");

  const description = stringField(metadata, "description");
  if (!description) errors.push("missing required string `description`");
  else if (description.length > 240)
    errors.push("`description` must be concise (240 characters or fewer)");

  const tags = metadata.tags;
  if (
    !Array.isArray(tags) ||
    tags.length === 0 ||
    tags.some((tag) => typeof tag !== "string" || !tag.trim())
  ) {
    errors.push("missing non-empty string `tags` array");
  }

  if (metadata.rank !== undefined) {
    if (
      typeof metadata.rank !== "number" ||
      !Number.isInteger(metadata.rank) ||
      metadata.rank < 0
    ) {
      errors.push("`rank` must be a non-negative integer when present");
    }
  }

  return errors;
}

/**
 * Validates every Help file together, including duplicate IDs. Duplicate IDs
 * are detected across both hidden and visible files because the human Help
 * loader resolves duplicates before filtering hidden articles.
 */
export function validateHelpCorpus(
  sources: readonly HelpCorpusSource[],
): string[] {
  const errors: string[] = [];
  const seen = new Map<string, string>();

  for (const { source, raw } of sources) {
    for (const error of validateHelpArticleFrontMatter(raw)) {
      errors.push(`${source}: ${error}`);
    }

    const parsed = parseFrontMatter(raw);
    if (!parsed.value) continue;
    const id = stringField(parsed.value.metadata, "id");
    if (!id) continue;

    const previous = seen.get(id);
    if (previous)
      errors.push(`${source}: duplicate id "${id}" (also in ${previous})`);
    else seen.set(id, source);
  }
  return errors;
}

/**
 * Front-matter reader for the knowledge bundle. It deliberately uses the same
 * YAML parser and strict boolean hidden semantics as the human Help loader.
 * Full corpus validation runs before bundle generation.
 */
export function parseHelpArticle(raw: string): HelpArticleSource | null {
  const parsed = parseFrontMatter(raw);
  if (!parsed.value) return null;

  const { metadata, content } = parsed.value;
  if (metadata.hidden === true) return null;

  const id = stringField(metadata, "id");
  const title = stringField(metadata, "title");
  if (!id || !title) return null;

  return { id, title, content };
}
