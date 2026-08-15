import type { RandomSource } from "../types";
import { parseRandomSource } from "../parser";

/**
 * Reading back a file this app exported (issue 2263).
 *
 * The paste importer reads the shapes other tools produce — lines, columns, a
 * Markdown table — and builds table entries out of them. It cannot read our
 * own export, which carries frontmatter, a kind, spreads, reversed meanings
 * and image paths. Without this, export is a one-way door.
 */

export interface CodexImportOk {
  ok: true;
  source: RandomSource;
  /**
   * Named so the wizard can say what arrived without re-deriving it, and so a
   * deck whose art did not travel can say so out loud.
   */
  entryCount: number;
  cardCount: number;
  imagePaths: string[];
}

export interface CodexImportFailure {
  ok: false;
  error: string;
}

export type CodexImportResult = CodexImportOk | CodexImportFailure;

/**
 * Whether text is worth handing to `parseCodexImport` at all.
 *
 * Deliberately cheap and structural: the wizard uses it to decide which
 * preview to show while somebody is still pasting, so it must not depend on
 * the content being complete or valid yet.
 */
export function looksLikeCodexFile(text: string): boolean {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("---")) return false;
  return /^\s*kind:\s*(table|deck)\s*$/m.test(trimmed);
}

/**
 * Parses an exported file into a source ready to be saved.
 *
 * The id is *not* kept. A file re-imported into the vault it came from would
 * otherwise collide with the source still sitting there, and silently
 * replacing that source is a merge nobody asked for. A fresh id makes this a
 * copy, which is what importing means everywhere else in the app — and the
 * name collision that follows is already handled by the wizard.
 *
 * Entry and card ids *are* kept: they are internal to the source, and a deck's
 * draw state is keyed by deck id, so a copy starts with an empty discard pile
 * rather than inheriting one.
 */
export function parseCodexImport(
  text: string,
  newId: string,
): CodexImportResult {
  const parsed = parseRandomSource(text);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const source: RandomSource = { ...parsed.value, id: newId };

  return {
    ok: true,
    source,
    entryCount: source.entries?.length ?? 0,
    cardCount: source.cards?.length ?? 0,
    imagePaths: (source.cards ?? [])
      .map((c) => c.imagePath)
      .filter((p): p is string => !!p),
  };
}
