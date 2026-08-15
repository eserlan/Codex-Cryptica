import type { Diagnostic, RandomSource } from "random-source-engine";

/**
 * What `SourceWorkspace` hands its editor snippet (#2247).
 *
 * The workspace owns the list and every write; the editor only reports what
 * changed, which is what lets tables and decks share one shell.
 */
export interface EditorContext {
  source: RandomSource;
  diagnostics: Diagnostic[];
  onChange: (next: RandomSource) => void;
  /** Returns false when the workspace needs to ask the user first (FR-042). */
  onRename: (name: string) => boolean;
}

/**
 * What the workspace hands its play snippet (issue 2258).
 *
 * Deliberately thinner than `EditorContext`: play must not be able to change
 * the definition, so there is nothing here to change it with. Drawing still
 * writes — but to the deck's draw state, which the deck service owns, not to
 * the authored file.
 */
export interface PlayerContext {
  source: RandomSource;
}

/**
 * Authoring a source and using one at the table want opposite layouts: one
 * wants dense editable fields, the other a large target and a readable result.
 */
export type SourceMode = "use" | "build";

/**
 * Play is the default because the workspace is opened mid-session far more
 * often than it is opened to write something, and it is the mode that works on
 * a phone without summoning a keyboard.
 */
export const DEFAULT_MODE: SourceMode = "use";

/** Honoured on arrival so a `?mode=build` link opens where it says it will. */
export const MODE_PARAM = "mode";

export const MODE_STORAGE_KEY = "codex-random-source-mode";

function asMode(value: string | null | undefined): SourceMode | undefined {
  return value === "use" || value === "build" ? value : undefined;
}

/**
 * The mode to open in: what the link asked for, else what was left last time,
 * else play.
 *
 * Read on arrival only. Switching mode deliberately does *not* write the URL:
 * in this app a URL change costs a webfont request, and rolling a table has to
 * work with the machine offline (FR-020, SC-005). What survives a reload is
 * the stored value instead.
 */
export function resolveMode(
  search: URLSearchParams,
  stored?: string | null,
): SourceMode {
  return asMode(search.get(MODE_PARAM)) ?? asMode(stored) ?? DEFAULT_MODE;
}
